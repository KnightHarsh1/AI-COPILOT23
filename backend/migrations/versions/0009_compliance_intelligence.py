"""Business Command Center: compliance intelligence

Revision ID: 0009_compliance_intelligence
Revises: 0008_command_center_data
Create Date: 2026-06-19 00:00:01.000000

Additive: company compliance profile columns + new compliance_deadlines
table. No existing column altered.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0009_compliance_intelligence'
down_revision = '0008_command_center_data'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('gstin', sa.String(length=15), nullable=True))
    op.add_column('companies', sa.Column('pan', sa.String(length=10), nullable=True))
    op.add_column('companies', sa.Column('gst_filing_frequency', sa.String(length=16), nullable=False, server_default='monthly'))
    op.add_column('companies', sa.Column('compliance_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')))

    op.create_table(
        'compliance_deadlines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('deadline_type', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='upcoming'),
        sa.Column('period_label', sa.String(length=64), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_compliance_deadlines_company_id', 'compliance_deadlines', ['company_id'])
    op.create_index('ix_compliance_deadlines_due_date', 'compliance_deadlines', ['due_date'])


def downgrade() -> None:
    op.drop_index('ix_compliance_deadlines_due_date', table_name='compliance_deadlines')
    op.drop_index('ix_compliance_deadlines_company_id', table_name='compliance_deadlines')
    op.drop_table('compliance_deadlines')

    op.drop_column('companies', 'compliance_enabled')
    op.drop_column('companies', 'gst_filing_frequency')
    op.drop_column('companies', 'pan')
    op.drop_column('companies', 'gstin')
