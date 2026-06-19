"""Business Command Center: collections + product intelligence fields

Revision ID: 0008_command_center_data
Revises: 0007_normalized_data_layer
Create Date: 2026-06-19 00:00:00.000000

Additive columns only. No existing column is altered. Existing rows get
safe defaults (payment_status='unknown', amount_paid=0, etc.).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0008_command_center_data'
down_revision = '0007_normalized_data_layer'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Collections Intelligence fields on sales.
    op.add_column('sales', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('sales', sa.Column('payment_status', sa.String(length=16), nullable=False, server_default='unknown'))
    op.add_column('sales', sa.Column('amount_paid', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales', sa.Column('is_credit_sale', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('sales', sa.Column('paid_date', sa.Date(), nullable=True))

    # Product Intelligence link on sales.
    op.add_column('sales', sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_sales_inventory_item_id', 'sales', 'inventory_items',
        ['inventory_item_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_sales_inventory_item_id', 'sales', ['inventory_item_id'])

    # Product Intelligence velocity fields on inventory_items.
    op.add_column('inventory_items', sa.Column('last_sold_date', sa.Date(), nullable=True))
    op.add_column('inventory_items', sa.Column('total_units_sold', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('inventory_items', 'total_units_sold')
    op.drop_column('inventory_items', 'last_sold_date')

    op.drop_index('ix_sales_inventory_item_id', table_name='sales')
    op.drop_constraint('fk_sales_inventory_item_id', 'sales', type_='foreignkey')
    op.drop_column('sales', 'inventory_item_id')

    op.drop_column('sales', 'paid_date')
    op.drop_column('sales', 'is_credit_sale')
    op.drop_column('sales', 'amount_paid')
    op.drop_column('sales', 'payment_status')
    op.drop_column('sales', 'due_date')
