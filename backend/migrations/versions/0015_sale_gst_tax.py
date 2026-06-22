"""Sale GST tax columns (for Compliance/GST Liability Intelligence)

Revision ID: 0015_sale_gst_tax
Revises: 0014_sale_customer_name
Create Date: 2026-06-22 09:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0015_sale_gst_tax'
down_revision = '0014_sale_customer_name'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('taxable_value', sa.Numeric(16, 2), nullable=True))
    op.add_column('sales', sa.Column('cgst', sa.Numeric(16, 2), nullable=True))
    op.add_column('sales', sa.Column('sgst', sa.Numeric(16, 2), nullable=True))
    op.add_column('sales', sa.Column('igst', sa.Numeric(16, 2), nullable=True))
    op.add_column('sales', sa.Column('total_tax', sa.Numeric(16, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('sales', 'total_tax')
    op.drop_column('sales', 'igst')
    op.drop_column('sales', 'sgst')
    op.drop_column('sales', 'cgst')
    op.drop_column('sales', 'taxable_value')
