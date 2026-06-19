"""Refines an already-detected balance_sheet RawTable. The actual logic
is shared with profit_and_loss_parser.py -- see statement_refinement.py
-- since both formats have the same section-header/subtotal-row quirk.
"""

from app.services.ingestion.parsers import RawTable
from app.services.ingestion.parsers.statement_refinement import refine_statement_table


class BalanceSheetParser:
    def refine(self, table: RawTable) -> RawTable:
        return refine_statement_table(table)
