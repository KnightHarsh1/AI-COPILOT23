"""Sprint 2-3 + Market Radar: user profile, upload frequency, market signals

Revision ID: 0010_radar_and_preferences
Revises: 0009_compliance_intelligence
Create Date: 2026-06-19 12:00:00.000000

Additive only: user avatar/risk fields, company upload-frequency + business
profile fields, and two new market-intelligence tables.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0010_radar_and_preferences'
down_revision = '0009_compliance_intelligence'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # User profile / preference fields.
    op.add_column('users', sa.Column('avatar_url', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('avatar_preset', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('risk_appetite', sa.String(length=16), nullable=False, server_default='balanced'))

    # Company upload frequency + business profile fields.
    op.add_column('companies', sa.Column('upload_frequency', sa.String(length=16), nullable=False, server_default='monthly'))
    op.add_column('companies', sa.Column('last_data_upload_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('companies', sa.Column('sub_industry', sa.String(length=128), nullable=True))
    op.add_column('companies', sa.Column('primary_cost_driver', sa.String(length=64), nullable=True))
    op.add_column('companies', sa.Column('monthly_revenue_goal', sa.String(length=32), nullable=True))
    op.add_column('companies', sa.Column('business_goal', sa.String(length=64), nullable=True))

    # Market signal catalog (shared across companies).
    op.create_table(
        'market_signals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('signal_type', sa.String(length=32), nullable=False),
        sa.Column('direction', sa.String(length=16), nullable=False, server_default='threat'),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('industries', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('regions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('impact_model', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('severity_base', sa.Numeric(3, 1), nullable=False, server_default='3'),
        sa.Column('source_name', sa.String(length=128), nullable=True),
        sa.Column('source_url', sa.String(length=512), nullable=True),
        sa.Column('published_at', sa.Date(), nullable=True),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_market_signals_signal_type', 'market_signals', ['signal_type'])
    op.create_index('ix_market_signals_valid_until', 'market_signals', ['valid_until'])

    # Per-company materialized insights.
    op.create_table(
        'user_market_insights',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('signal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('market_signals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('direction', sa.String(length=16), nullable=False),
        sa.Column('severity', sa.Numeric(4, 1), nullable=False, server_default='0'),
        sa.Column('impact_amount_low', sa.Numeric(16, 2), nullable=True),
        sa.Column('impact_amount_high', sa.Numeric(16, 2), nullable=True),
        sa.Column('headline', sa.String(length=256), nullable=True),
        sa.Column('why_it_matters', sa.Text(), nullable=True),
        sa.Column('recommended_action', sa.Text(), nullable=True),
        sa.Column('match_reasons', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_user_market_insights_company_id', 'user_market_insights', ['company_id'])


def downgrade() -> None:
    op.drop_index('ix_user_market_insights_company_id', table_name='user_market_insights')
    op.drop_table('user_market_insights')
    op.drop_index('ix_market_signals_valid_until', table_name='market_signals')
    op.drop_index('ix_market_signals_signal_type', table_name='market_signals')
    op.drop_table('market_signals')

    op.drop_column('companies', 'business_goal')
    op.drop_column('companies', 'monthly_revenue_goal')
    op.drop_column('companies', 'primary_cost_driver')
    op.drop_column('companies', 'sub_industry')
    op.drop_column('companies', 'last_data_upload_at')
    op.drop_column('companies', 'upload_frequency')

    op.drop_column('users', 'risk_appetite')
    op.drop_column('users', 'avatar_preset')
    op.drop_column('users', 'avatar_url')
