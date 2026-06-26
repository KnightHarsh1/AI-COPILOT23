"""Purchase records for GST reconciliation (GSTR-2B / purchase register)

Revision ID: 0018_purchase_records
Revises: 0017_data_dictionary
Create Date: 2026-06-26 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

from app.db.base import UUID

revision = '0018_purchase_records'
down_revision = '0017_data_dictionary'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'purchase_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', UUID(as_uuid=True),
                  sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('invoice_number', sa.String(length=128), nullable=True),
        sa.Column('invoice_date', sa.Date(), nullable=True, index=True),
        sa.Column('supplier_name', sa.String(length=255), nullable=True),
        sa.Column('supplier_gstin', sa.String(length=20), nullable=True),
        sa.Column('taxable_value', sa.Numeric(16, 2), nullable=True),
        sa.Column('cgst', sa.Numeric(16, 2), nullable=True),
        sa.Column('sgst', sa.Numeric(16, 2), nullable=True),
        sa.Column('igst', sa.Numeric(16, 2), nullable=True),
        sa.Column('total_tax', sa.Numeric(16, 2), nullable=True),
        sa.Column('source', sa.String(length=32), nullable=True),
        sa.Column('period_label', sa.String(length=16), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('purchase_records')
