"""Seed catalog of market signals across major Indian SME industries.

This makes the Radar genuinely useful from the first run, before any
live signal-sourcing job exists (Radar roadmap phase R3). Idempotent:
seeding checks for an existing identical title before inserting, so it
can be safely re-run.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db.models.market import MarketSignal

# Each entry: type, direction, title, summary, industries, impact lever +
# magnitude, baseline severity. Kept plain-language and evergreen-ish.
_SEED = [
    ('supplier', 'threat', 'Raw material prices trending upward',
     'Several core raw materials have seen price increases this quarter, with further rises expected.',
     ['plastics', 'steel', 'manufacturing', 'textile', 'construction'],
     {'lever': 'raw_material_cost', 'magnitude_pct': 12}, 4),
    ('regulatory', 'threat', 'Tighter packaging and plastic-use norms expected',
     'Regulators are signalling stricter rules on single-use and non-recyclable packaging.',
     ['plastics', 'food processing', 'retail', 'manufacturing'],
     {'lever': 'compliance_cost', 'magnitude_pct': 5}, 3),
    ('scheme', 'opportunity', 'MSME credit and subsidy schemes expanded',
     'Government MSME schemes offering cheaper credit and capital subsidies have been widened.',
     ['manufacturing', 'textile', 'food processing', 'services', 'retail', 'wholesale', 'construction'],
     {'lever': 'cost_saving', 'magnitude_pct': 8}, 3),
    ('incentive', 'opportunity', 'Export incentives improved for small exporters',
     'Revised export incentive schemes improve realisations for small and mid exporters.',
     ['textile', 'manufacturing', 'food processing', 'wholesale'],
     {'lever': 'selling_price', 'magnitude_pct': 6}, 3),
    ('market', 'opportunity', 'Festive-season demand expected to rise',
     'Seasonal demand is forecast to climb in the coming weeks across consumer-facing sectors.',
     ['retail', 'food processing', 'textile', 'wholesale', 'services'],
     {'lever': 'demand', 'magnitude_pct': 15}, 3),
    ('economic', 'threat', 'Lending rates remain elevated',
     'Borrowing costs stay high, raising the cost of working-capital and term loans.',
     ['manufacturing', 'construction', 'retail', 'wholesale', 'services', 'textile'],
     {'lever': 'finance_cost', 'magnitude_pct': 4}, 3),
    ('market', 'threat', 'Steel prices expected to increase',
     'Steel input costs are projected to rise, affecting fabrication and construction margins.',
     ['steel', 'construction', 'manufacturing'],
     {'lever': 'raw_material_cost', 'magnitude_pct': 10}, 4),
    ('technology', 'opportunity', 'Low-cost digital payments and billing tools maturing',
     'Affordable digital billing and payment tools can cut collection times and admin cost.',
     ['retail', 'services', 'wholesale', 'food processing'],
     {'lever': 'cost_saving', 'magnitude_pct': 3}, 2),
]


def seed_market_signals(session: Session) -> int:
    written = 0
    today = date.today()
    for signal_type, direction, title, summary, industries, impact, sev in _SEED:
        exists = session.query(MarketSignal).filter(MarketSignal.title == title).first()
        if exists:
            continue
        session.add(MarketSignal(
            signal_type=signal_type,
            direction=direction,
            title=title,
            summary=summary,
            industries=industries,
            regions=['national'],
            impact_model=impact,
            severity_base=sev,
            source_name='Business Copilot curated',
            published_at=today,
            valid_until=today + timedelta(days=90),
        ))
        written += 1
    session.commit()
    return written
