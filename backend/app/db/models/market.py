import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, JSONB, UUID


class MarketSignal(Base):
    """The curated signal catalog. Shared across all companies (not
    company-scoped) -- one signal about, say, a GST change is matched and
    personalized per company at read time rather than duplicated. Populated
    by an admin/seed/scheduled job, not by end users.
    """

    __tablename__ = 'market_signals'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    # regulatory | market | economic | supplier | technology | scheme | incentive
    signal_type = Column(String(32), nullable=False, index=True)
    direction = Column(String(16), nullable=False, default='threat')  # threat | opportunity

    title = Column(String(256), nullable=False)
    summary = Column(Text, nullable=False)

    # Matching tags -- JSON arrays of lowercase industry / region strings.
    industries = Column(JSONB, nullable=False, default=list)
    regions = Column(JSONB, nullable=True)

    # Structured impact model: which lever it hits + magnitude hint.
    # e.g. {"lever": "raw_material_cost", "magnitude_pct": 12}
    impact_model = Column(JSONB, nullable=True)
    severity_base = Column(Numeric(3, 1), nullable=False, default=3)  # 1-5 before personalization

    source_name = Column(String(128), nullable=True)
    source_url = Column(String(512), nullable=True)
    published_at = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserMarketInsight(Base):
    """A market signal matched and personalized to one company, with the
    computed rupee impact and the user's dismiss/act state. Materialized so
    the Command Center loads instantly instead of recomputing on every view.
    """

    __tablename__ = 'user_market_insights'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    signal_id = Column(UUID(as_uuid=True), ForeignKey('market_signals.id', ondelete='CASCADE'), nullable=False)

    direction = Column(String(16), nullable=False)  # threat | opportunity
    severity = Column(Numeric(4, 1), nullable=False, default=0)  # personalized 0-100
    impact_amount_low = Column(Numeric(16, 2), nullable=True)
    impact_amount_high = Column(Numeric(16, 2), nullable=True)

    # AI-translated (or templated) plain-language card fields.
    headline = Column(String(256), nullable=True)
    why_it_matters = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    match_reasons = Column(JSONB, nullable=True)  # ["Plastics industry", "Raw material is 60% of costs"]

    status = Column(String(16), nullable=False, default='active')  # active | dismissed | acted
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='market_insights')
    signal = relationship('MarketSignal')
