"""Add period and payload fields to reports table

Revision ID: 0003_add_report_fields
Revises: 0002_add_alert_type
Create Date: 2026-06-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003_add_report_fields'
down_revision = '0002_add_alert_type'
branch_labels = None
default_branch = None


def upgrade() -> None:
    op.add_column('reports', sa.Column('period_start', sa.Date(), nullable=True))
    op.add_column('reports', sa.Column('period_end', sa.Date(), nullable=True))
    op.add_column('reports', sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('reports', 'payload')
    op.drop_column('reports', 'period_end')
    op.drop_column('reports', 'period_start')
