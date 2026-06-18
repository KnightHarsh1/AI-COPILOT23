"""Add file hash, source file tracking, user preferences, recommendation priority

Revision ID: 0005_copilot_upgrade
Revises: 0004_add_recommendations
Create Date: 2026-06-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005_copilot_upgrade'
down_revision = '0004_add_recommendations'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # files.file_hash existed on the model but was never migrated.
    op.add_column('files', sa.Column('file_hash', sa.String(length=64), nullable=True))
    op.create_index('ix_files_file_hash', 'files', ['file_hash'])

    # Track which uploaded file produced each sale / expense row so that
    # deleting a file can also remove the records it created.
    op.add_column('sales', sa.Column('source_file_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_sales_source_file_id', 'sales', 'files', ['source_file_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_sales_source_file_id', 'sales', ['source_file_id'])

    op.add_column('expenses', sa.Column('source_file_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_expenses_source_file_id', 'expenses', 'files', ['source_file_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_expenses_source_file_id', 'expenses', ['source_file_id'])

    # User preferences: theme, notifications, AI personalization.
    op.add_column('users', sa.Column('theme', sa.String(length=16), nullable=False, server_default='system'))
    op.add_column('users', sa.Column('email_alerts_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('risk_alerts_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('weekly_reports_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('ai_personality', sa.String(length=32), nullable=False, server_default='balanced'))
    op.add_column('users', sa.Column('ai_report_style', sa.String(length=32), nullable=False, server_default='concise'))
    op.add_column('users', sa.Column('ai_summary_length', sa.String(length=16), nullable=False, server_default='medium'))

    # Recommendations: structured priority + expected impact.
    op.add_column('recommendations', sa.Column('priority', sa.String(length=16), nullable=False, server_default='medium'))
    op.add_column('recommendations', sa.Column('expected_impact', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('recommendations', 'expected_impact')
    op.drop_column('recommendations', 'priority')

    op.drop_column('users', 'ai_summary_length')
    op.drop_column('users', 'ai_report_style')
    op.drop_column('users', 'ai_personality')
    op.drop_column('users', 'weekly_reports_enabled')
    op.drop_column('users', 'risk_alerts_enabled')
    op.drop_column('users', 'email_alerts_enabled')
    op.drop_column('users', 'theme')

    op.drop_index('ix_expenses_source_file_id', table_name='expenses')
    op.drop_constraint('fk_expenses_source_file_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'source_file_id')

    op.drop_index('ix_sales_source_file_id', table_name='sales')
    op.drop_constraint('fk_sales_source_file_id', 'sales', type_='foreignkey')
    op.drop_column('sales', 'source_file_id')

    op.drop_index('ix_files_file_hash', table_name='files')
    op.drop_column('files', 'file_hash')
