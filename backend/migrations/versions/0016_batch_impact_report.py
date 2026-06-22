"""Ingestion batch impact_report

Revision ID: 0016_batch_impact_report
Revises: 0014_sale_customer_name
Create Date: 2026-06-22 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0016_batch_impact_report'
down_revision = '0015_sale_gst_tax'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # JSON works on both SQLite and Postgres; use JSON for portability.
    op.add_column('ingestion_batches', sa.Column('impact_report', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('ingestion_batches', 'impact_report')
