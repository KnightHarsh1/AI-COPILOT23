"""User phone + team_role

Revision ID: 0012_user_phone_role
Revises: 0011_goals_audit_team
Create Date: 2026-06-20 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0012_user_phone_role'
down_revision = '0011_goals_audit_team'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('team_role', sa.String(length=24), nullable=False, server_default='owner'))


def downgrade() -> None:
    op.drop_column('users', 'team_role')
    op.drop_column('users', 'phone')
