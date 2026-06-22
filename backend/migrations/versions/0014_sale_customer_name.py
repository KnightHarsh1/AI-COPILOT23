"""Sale customer_name (for Customer Intelligence)

Revision ID: 0014_sale_customer_name
Revises: 0013_user_appearance
Create Date: 2026-06-22 06:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0014_sale_customer_name'
down_revision = '0013_user_appearance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('customer_name', sa.String(length=256), nullable=True))
    op.create_index('ix_sales_customer_name', 'sales', ['customer_name'])


def downgrade() -> None:
    op.drop_index('ix_sales_customer_name', table_name='sales')
    op.drop_column('sales', 'customer_name')
