"""User appearance_preferences

Revision ID: 0013_user_appearance
Revises: 0012_user_phone_role
Create Date: 2026-06-21 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0013_user_appearance'
down_revision = '0012_user_phone_role'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # JSON works on both PostgreSQL and SQLite (3.9+); nullable so existing
    # users default to the Classic dashboard until they choose otherwise.
    op.add_column('users', sa.Column('appearance_preferences', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'appearance_preferences')
