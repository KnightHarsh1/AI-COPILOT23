"""Universal Data Upload Engine, Phase 3: normalized data layer

Revision ID: 0007_normalized_data_layer
Revises: 0006_ingestion_foundation
Create Date: 2026-06-18 00:00:01.000000

Adds two net-new tables (financial_statement_lines, bank_transactions).
Independent of 0006's tables beyond the shared companies/files FKs --
see PRODUCTION_ARCHITECTURE_REVIEW.md section 4.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0007_normalized_data_layer'
down_revision = '0006_ingestion_foundation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'financial_statement_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='SET NULL'), nullable=True),
        sa.Column('statement_type', sa.String(length=32), nullable=False),
        sa.Column('statement_date', sa.Date(), nullable=False),
        sa.Column('line_category', sa.String(length=64), nullable=False),
        sa.Column('line_label', sa.String(length=256), nullable=False),
        sa.Column('amount', sa.Numeric(16, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_financial_statement_lines_company_id', 'financial_statement_lines', ['company_id'])
    op.create_index('ix_financial_statement_lines_source_file_id', 'financial_statement_lines', ['source_file_id'])
    op.create_index('ix_financial_statement_lines_statement_type', 'financial_statement_lines', ['statement_type'])
    op.create_index('ix_financial_statement_lines_statement_date', 'financial_statement_lines', ['statement_date'])
    op.create_index('ix_financial_statement_lines_line_category', 'financial_statement_lines', ['line_category'])

    op.create_table(
        'bank_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='SET NULL'), nullable=True),
        sa.Column('bank_name', sa.String(length=128), nullable=True),
        sa.Column('account_number_masked', sa.String(length=8), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('debit_amount', sa.Numeric(16, 2), nullable=True),
        sa.Column('credit_amount', sa.Numeric(16, 2), nullable=True),
        sa.Column('balance_after', sa.Numeric(16, 2), nullable=True),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('reconciled_sale_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sales.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reconciled_expense_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('expenses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_bank_transactions_company_id', 'bank_transactions', ['company_id'])
    op.create_index('ix_bank_transactions_source_file_id', 'bank_transactions', ['source_file_id'])
    op.create_index('ix_bank_transactions_transaction_date', 'bank_transactions', ['transaction_date'])


def downgrade() -> None:
    op.drop_index('ix_bank_transactions_transaction_date', table_name='bank_transactions')
    op.drop_index('ix_bank_transactions_source_file_id', table_name='bank_transactions')
    op.drop_index('ix_bank_transactions_company_id', table_name='bank_transactions')
    op.drop_table('bank_transactions')

    op.drop_index('ix_financial_statement_lines_line_category', table_name='financial_statement_lines')
    op.drop_index('ix_financial_statement_lines_statement_date', table_name='financial_statement_lines')
    op.drop_index('ix_financial_statement_lines_statement_type', table_name='financial_statement_lines')
    op.drop_index('ix_financial_statement_lines_source_file_id', table_name='financial_statement_lines')
    op.drop_index('ix_financial_statement_lines_company_id', table_name='financial_statement_lines')
    op.drop_table('financial_statement_lines')
