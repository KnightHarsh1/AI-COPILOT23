"""PDF parser. Indian SME bank statements, invoices and GST returns are very
often PDFs. This extracts tabular data with pdfplumber: it prefers detected
tables (most bank/GST exports have them), and falls back to whitespace-split
text lines when no ruled table is present. Each page's largest table becomes
a RawTable so the existing detection + mapping pipeline can take over.
"""

from pathlib import Path
from typing import List

from app.services.ingestion.parsers import ParseError, RawTable


def _clean(cell):
    if cell is None:
        return None
    s = str(cell).replace("\n", " ").strip()
    return s or None


def _looks_like_header(row) -> bool:
    # A header row is mostly non-numeric text.
    non_empty = [c for c in row if c]
    if not non_empty:
        return False
    numericish = sum(1 for c in non_empty if str(c).replace(",", "").replace(".", "").replace("-", "").isdigit())
    return numericish <= len(non_empty) / 2


class PDFParser:
    def parse(self, file_path: Path) -> List[RawTable]:
        try:
            import pdfplumber
        except Exception as exc:  # pragma: no cover
            raise ParseError(
                "PDF support needs the 'pdfplumber' package. Install it, or upload the data as CSV/Excel."
            ) from exc

        tables: List[RawTable] = []
        try:
            with pdfplumber.open(str(file_path)) as pdf:
                for page_index, page in enumerate(pdf.pages):
                    extracted = page.extract_tables() or []
                    # Keep the largest table on the page (most likely the data).
                    extracted = sorted(extracted, key=lambda t: len(t or []), reverse=True)
                    for raw in extracted[:1]:
                        cleaned = [[_clean(c) for c in r] for r in raw if any(_clean(c) for c in r)]
                        if len(cleaned) < 2:
                            continue
                        header_idx = 0
                        for i, r in enumerate(cleaned[:3]):
                            if _looks_like_header(r):
                                header_idx = i
                                break
                        headers = [h or f"col_{j}" for j, h in enumerate(cleaned[header_idx])]
                        body = cleaned[header_idx + 1:]
                        # Normalize row widths to header length.
                        norm = []
                        for r in body:
                            r = (r + [None] * len(headers))[:len(headers)]
                            norm.append(r)
                        if norm:
                            tables.append(RawTable(headers=headers, rows=norm,
                                                   sheet_name=f"Page {page_index + 1}"))

                # Fallback: no ruled tables found — split text into columns.
                if not tables:
                    for page_index, page in enumerate(pdf.pages):
                        text = page.extract_text() or ""
                        lines = [ln for ln in text.splitlines() if ln.strip()]
                        rows = [ln.split() for ln in lines]
                        rows = [r for r in rows if len(r) >= 2]
                        if len(rows) >= 2:
                            width = max(len(r) for r in rows)
                            headers = rows[0] + [f"col_{i}" for i in range(len(rows[0]), width)]
                            body = [(r + [None] * width)[:width] for r in rows[1:]]
                            tables.append(RawTable(headers=[str(h) for h in headers], rows=body,
                                                   sheet_name=f"Page {page_index + 1}"))
        except ParseError:
            raise
        except Exception as exc:
            raise ParseError(f"Could not read PDF file: {exc}") from exc

        if not tables:
            raise ParseError("No readable tables found in this PDF. Try a CSV/Excel export instead.")
        return tables
