"""Add alert type field to alerts table

Revision ID: 0002_add_alert_type
Revises: 0001_initial
Create Date: 2026-06-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_add_alert_type'
down_revision = '0001_initial'
branch_labels = None
default_branch = None


def upgrade() -> None:
    op.add_column(
        'alerts',
        sa.Column('alert_type', sa.String(length=64), nullable=False, server_default='general'),
    )
    op.alter_column('alerts', 'alert_type', server_default=None)


def downgrade() -> None:
    op.drop_column('alerts', 'alert_type')
