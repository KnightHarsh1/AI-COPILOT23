"""Suggests a mapping from a file's actual column headers to the
canonical field names in canonical_field_dictionary.py.

Three-step waterfall, cheapest and most certain first:
  1. Mapping memory -- an exact match on this company's previously
     confirmed layout. Zero cost, zero latency, zero AI involved.
  2. Heuristic fuzzy matching against the canonical field synonym lists.
     Resolves the common, obvious cases for free.
  3. A single batched Gemini call for whatever's left unresolved. One
     call per file, never one call per column -- a deliberate cost and
     latency control from the architecture doc.

Every suggestion carries a `source` tag (memory / heuristic / ai /
unmapped) so the review UI can show *why* a mapping was suggested, and
nothing here ever writes to the database -- that's NormalizationService's
job, only after a human confirms.
"""

import difflib
import json
import re
from dataclasses import dataclass
from typing import List, Optional

from app.services.gemini_service import GeminiService
from app.services.ingestion.canonical_field_dictionary import (
    FieldSpec,
    all_fields_for,
    all_fields_across_types,
    inference_order,
    required_fields_for,
)
from app.services.ingestion.mapping_memory_service import MappingMemoryService, compute_signature_hash
from app.services.ingestion.parsers import RawTable


def required_fields_for_safe(document_type: str):
    try:
        return required_fields_for(document_type)
    except Exception:
        return []

HEURISTIC_CONFIDENCE_THRESHOLD = 60.0
_MAX_SAMPLE_VALUES = 3


@dataclass
class ColumnSuggestion:
    source_column: str
    sample_values: List[str]
    suggested_field: Optional[str]
    confidence: float
    source: str  # memory | heuristic | ai | unmapped


def _normalize(text: str) -> str:
    return re.sub(r'[^a-z0-9 ]', ' ', str(text).lower()).strip()


def _similarity(header: str, candidate: str) -> float:
    """Hybrid score: token overlap handles word-reordering ("Sale Date"
    vs "Date of Sale"), difflib's character-level ratio handles typos
    and partial matches. Whichever scores higher wins, scaled to 0-100.
    """
    h, c = _normalize(header), _normalize(candidate)
    if not h or not c:
        return 0.0

    h_tokens, c_tokens = set(h.split()), set(c.split())
    token_score = len(h_tokens & c_tokens) / max(len(h_tokens | c_tokens), 1) if (h_tokens and c_tokens) else 0.0
    char_score = difflib.SequenceMatcher(None, h, c).ratio()

    return max(token_score, char_score) * 100.0


def _best_field_match(header: str, fields: List[FieldSpec]) -> tuple:
    """Returns (field_name, confidence) for the single best-matching
    canonical field, checking the field name itself plus every synonym."""
    best_field, best_score = None, 0.0

    for field in fields:
        candidates = [field.name.replace('_', ' ')] + field.synonyms
        score = max(_similarity(header, candidate) for candidate in candidates)
        if score > best_score:
            best_field, best_score = field.name, score

    return best_field, best_score


def _sample_values(table: RawTable, column_index: int) -> List[str]:
    values = []
    for row in table.rows[:20]:
        if column_index < len(row) and row[column_index] is not None:
            values.append(str(row[column_index]))
        if len(values) >= _MAX_SAMPLE_VALUES:
            break
    return values


def _extract_json(text: str):
    """Defensive JSON extraction -- Gemini is asked for strict JSON but
    may wrap it in markdown fences or add stray text. Returns None
    (never raises) if nothing parseable is found, so a malformed AI
    response degrades to "leave these columns unmapped", never a crash.
    """
    if not text:
        return None

    cleaned = text.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)

    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    start, end = cleaned.find('{'), cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(cleaned[start:end + 1])
        except (json.JSONDecodeError, ValueError):
            return None

    return None


class ColumnMappingService:
    def __init__(self, session, gemini_service: Optional[GeminiService] = None):
        self.session = session
        self.mapping_memory = MappingMemoryService(session)
        self.gemini = gemini_service

    def suggest_mapping(self, table: RawTable, document_type: str, company_id) -> List[ColumnSuggestion]:
        memory_hit = self.mapping_memory.find_cached_mapping(
            company_id, compute_signature_hash(table.headers)
        )

        if memory_hit is not None:
            return [
                ColumnSuggestion(
                    source_column=header,
                    sample_values=_sample_values(table, idx),
                    suggested_field=memory_hit.mapping.get(header),
                    confidence=float(memory_hit.confidence),
                    source='memory',
                )
                for idx, header in enumerate(table.headers)
            ]

        fields = all_fields_for(document_type)
        suggestions: List[ColumnSuggestion] = []
        used_fields = set()
        unresolved_indices: List[int] = []

        # Heuristic pass, but resolved greedily by overall best score
        # first so two columns that both look like "amount" don't both
        # grab the same canonical field.
        candidates = []
        for idx, header in enumerate(table.headers):
            field_name, score = _best_field_match(header, fields)
            candidates.append((idx, header, field_name, score))

        for idx, header, field_name, score in sorted(candidates, key=lambda c: c[3], reverse=True):
            if score >= HEURISTIC_CONFIDENCE_THRESHOLD and field_name not in used_fields:
                suggestions.append(ColumnSuggestion(
                    source_column=header,
                    sample_values=_sample_values(table, idx),
                    suggested_field=field_name,
                    confidence=round(score, 2),
                    source='heuristic',
                ))
                used_fields.add(field_name)
            else:
                unresolved_indices.append(idx)

        # Restore original column order (the loop above processed by score).
        suggestions_by_column = {s.source_column: s for s in suggestions}

        if unresolved_indices and self.gemini is not None and self.gemini.available:
            ai_suggestions = self._ai_fallback(table, unresolved_indices, document_type, used_fields)
            for header, suggestion in ai_suggestions.items():
                suggestions_by_column[header] = suggestion
                unresolved_indices = [i for i in unresolved_indices if table.headers[i] != header]

        for idx in unresolved_indices:
            header = table.headers[idx]
            if header not in suggestions_by_column:
                suggestions_by_column[header] = ColumnSuggestion(
                    source_column=header,
                    sample_values=_sample_values(table, idx),
                    suggested_field=None,
                    confidence=0.0,
                    source='unmapped',
                )

        return [suggestions_by_column[h] for h in table.headers]

    # Confidence below which we don't trust the detected type and instead
    # match across ALL field types, then infer the type from the winners.
    LOW_CONFIDENCE_THRESHOLD = 55.0

    def suggest_with_inference(self, table: RawTable, detected_type: str, detection_confidence: float, company_id):
        """Returns (suggestions, inferred_type, inferred_confidence).

        When the detected type is unknown or low-confidence, this matches
        every column against the canonical fields of EVERY document type,
        keeps the best per column, then infers the document type from which
        type's fields won the most (weighted by required-field coverage and
        match confidence). This is what rescues a plain "Date, Customer,
        Item, Qty, Amount" sheet that header-signature detection alone
        can't classify -- the columns clearly map to sales fields, so the
        type is inferred as sales.

        When the detected type is confident, this defers to the normal
        single-type mapping unchanged.
        """
        # Memory hit always wins, regardless of detected type.
        memory_hit = self.mapping_memory.find_cached_mapping(
            company_id, compute_signature_hash(table.headers)
        )
        if memory_hit is not None:
            suggestions = self.suggest_mapping(table, detected_type, company_id)
            return suggestions, detected_type, detection_confidence

        confident = detected_type != 'unknown' and detection_confidence >= self.LOW_CONFIDENCE_THRESHOLD
        if confident:
            return self.suggest_mapping(table, detected_type, company_id), detected_type, detection_confidence

        # --- Cross-type matching ---
        type_pairs = all_fields_across_types()  # [(doc_type, FieldSpec), ...] in priority order

        # For each column, find its single best (doc_type, field, score).
        column_best = {}
        for idx, header in enumerate(table.headers):
            best = (None, None, 0.0)  # (doc_type, field_name, score)
            for doc_type, spec in type_pairs:
                candidates = [spec.name.replace('_', ' ')] + spec.synonyms
                score = max(_similarity(header, c) for c in candidates)
                if score > best[2]:
                    best = (doc_type, spec.name, score)
            column_best[idx] = best

        # Tally evidence per document type from columns that matched well.
        type_scores = {}
        for idx, (doc_type, field_name, score) in column_best.items():
            if doc_type and score >= HEURISTIC_CONFIDENCE_THRESHOLD:
                type_scores.setdefault(doc_type, {'total': 0.0, 'fields': set()})
                type_scores[doc_type]['total'] += score
                type_scores[doc_type]['fields'].add(field_name)

        if not type_scores:
            # Nothing matched anywhere -- genuinely unknown. Fall back to
            # the original behavior (everything unmapped) but don't crash.
            return self.suggest_mapping(table, detected_type, company_id), detected_type, detection_confidence

        # Score each candidate type: required-field coverage matters most
        # (a real sales file maps date+amount+category), then total signal.
        order = inference_order()

        def type_rank(doc_type):
            info = type_scores[doc_type]
            required = set(required_fields_for_safe(doc_type))
            covered = len(info['fields'] & required)
            # priority tiebreak: earlier in inference order = better
            priority = -order.index(doc_type) if doc_type in order else -99
            return (covered, info['total'], priority)

        inferred_type = max(type_scores.keys(), key=type_rank)

        # Now build the final suggestions using ONLY the inferred type's
        # fields, via the normal single-type path so dedup/greedy logic and
        # the AI fallback all apply consistently.
        suggestions = self.suggest_mapping(table, inferred_type, company_id)

        # Confidence: how much of the inferred type's required fields we
        # actually mapped, expressed 0-100, floored at a "we inferred this"
        # baseline so the UI shows it as a real suggestion.
        info = type_scores[inferred_type]
        required = set(required_fields_for_safe(inferred_type))
        coverage = (len(info['fields'] & required) / len(required)) if required else 0.5
        inferred_confidence = round(min(95.0, 55.0 + coverage * 40.0), 2)

        return suggestions, inferred_type, inferred_confidence

    def _ai_fallback(self, table: RawTable, unresolved_indices: List[int], document_type: str, used_fields: set) -> dict:
        fields = all_fields_for(document_type)
        available_fields = [f for f in fields if f.name not in used_fields]

        if not available_fields:
            return {}

        columns_block = '\n'.join(
            f'- "{table.headers[idx]}" (sample values: {", ".join(_sample_values(table, idx)) or "none"})'
            for idx in unresolved_indices
        )
        fields_block = '\n'.join(f'- {f.name}: {f.description}' for f in available_fields)

        prompt = (
            "You are mapping spreadsheet column headers to a fixed set of canonical fields "
            "for an Indian small-business accounting system.\n\n"
            f"Unmapped columns:\n{columns_block}\n\n"
            f"Canonical fields available:\n{fields_block}\n\n"
            "For each unmapped column, suggest the single best-matching canonical field, or null "
            "if none genuinely fits. Respond with ONLY a JSON object, no other text, no markdown "
            "fences, in exactly this shape:\n"
            '{"Column Header": {"field": "canonical_field_name_or_null", "confidence": 0-100}}'
        )

        raw_response = self.gemini.generate_response(prompt)
        parsed = _extract_json(raw_response)

        if not isinstance(parsed, dict):
            return {}

        results = {}
        claimed_fields = set(used_fields)

        for idx in unresolved_indices:
            header = table.headers[idx]
            entry = parsed.get(header)
            if not isinstance(entry, dict):
                continue

            field_name = entry.get('field')
            if field_name in claimed_fields:
                field_name = None  # already assigned -- don't double-map

            try:
                confidence = float(entry.get('confidence', 0))
            except (TypeError, ValueError):
                confidence = 0.0

            results[header] = ColumnSuggestion(
                source_column=header,
                sample_values=_sample_values(table, idx),
                suggested_field=field_name,
                confidence=confidence,
                source='ai' if field_name else 'unmapped',
            )
            if field_name:
                claimed_fields.add(field_name)

        return results
