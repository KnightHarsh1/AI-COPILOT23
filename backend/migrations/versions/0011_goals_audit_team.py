"""Goals, audit log, team members

Revision ID: 0011_goals_audit_team
Revises: 0010_radar_and_preferences
Create Date: 2026-06-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0011_goals_audit_team'
down_revision = '0010_radar_and_preferences'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('goal_type', sa.String(length=32), nullable=False),
        sa.Column('target_amount', sa.Numeric(16, 2), nullable=False),
        sa.Column('period', sa.String(length=16), nullable=False, server_default='monthly'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_goals_company_id', 'goals', ['company_id'])

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(length=48), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_audit_logs_company_id', 'audit_logs', ['company_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    op.create_table(
        'team_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=True),
        sa.Column('role', sa.String(length=24), nullable=False, server_default='read_only'),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='invited'),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_team_members_company_id', 'team_members', ['company_id'])


def downgrade() -> None:
    op.drop_table('team_members')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index('ix_goals_company_id', table_name='goals')
    op.drop_table('goals')
