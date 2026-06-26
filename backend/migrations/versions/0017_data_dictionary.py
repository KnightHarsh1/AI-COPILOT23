"""Data Dictionary entries (custom fields + synonyms)

Revision ID: 0017_data_dictionary
Revises: 0016_batch_impact_report
Create Date: 2026-06-25 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

from app.db.base import UUID

revision = '0017_data_dictionary'
down_revision = '0016_batch_impact_report'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'data_dictionary_entries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', UUID(as_uuid=True),
                  sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('key', sa.String(length=128), nullable=False, index=True),
        sa.Column('document_type', sa.String(length=32), nullable=True),
        sa.Column('field_name', sa.String(length=128), nullable=True),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('maps_to', sa.String(length=128), nullable=True),
        sa.Column('created_by_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('company_id', 'kind', 'key', name='uq_dict_company_kind_key'),
    )


def downgrade() -> None:
    op.drop_table('data_dictionary_entries')
