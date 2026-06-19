"""Universal Data Upload Engine, Phase 1: ingestion pipeline foundation

Revision ID: 0006_ingestion_foundation
Revises: 0005_copilot_upgrade
Create Date: 2026-06-18 00:00:00.000000

Adds three net-new tables (ingestion_batches, column_mapping_templates,
staging_rows). No existing table is altered -- see
PRODUCTION_ARCHITECTURE_REVIEW.md section 2.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006_ingestion_foundation'
down_revision = '0005_copilot_upgrade'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ingestion_batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.String(length=32), nullable=False, server_default='unknown'),
        sa.Column('detection_confidence', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('sheet_name', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='detected'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('confirmed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('committed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_ingestion_batches_company_id', 'ingestion_batches', ['company_id'])
    op.create_index('ix_ingestion_batches_file_id', 'ingestion_batches', ['file_id'])
    op.create_index('ix_ingestion_batches_status', 'ingestion_batches', ['status'])

    op.create_table(
        'column_mapping_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.String(length=32), nullable=False),
        sa.Column('source_signature_hash', sa.String(length=64), nullable=False),
        sa.Column('mapping', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('sample_source_headers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('confidence', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('times_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('company_id', 'source_signature_hash', name='uq_mapping_template_company_signature'),
    )
    op.create_index('ix_column_mapping_templates_company_id', 'column_mapping_templates', ['company_id'])
    op.create_index('ix_column_mapping_templates_source_signature_hash', 'column_mapping_templates', ['source_signature_hash'])

    op.create_table(
        'staging_rows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ingestion_batches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('row_index', sa.Integer(), nullable=False),
        sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('mapped_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('validation_status', sa.String(length=16), nullable=False, server_default='valid'),
        sa.Column('validation_messages', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_staging_rows_batch_id', 'staging_rows', ['batch_id'])


def downgrade() -> None:
    op.drop_index('ix_staging_rows_batch_id', table_name='staging_rows')
    op.drop_table('staging_rows')

    op.drop_index('ix_column_mapping_templates_source_signature_hash', table_name='column_mapping_templates')
    op.drop_index('ix_column_mapping_templates_company_id', table_name='column_mapping_templates')
    op.drop_table('column_mapping_templates')

    op.drop_index('ix_ingestion_batches_status', table_name='ingestion_batches')
    op.drop_index('ix_ingestion_batches_file_id', table_name='ingestion_batches')
    op.drop_index('ix_ingestion_batches_company_id', table_name='ingestion_batches')
    op.drop_table('ingestion_batches')
