"""Refines an already-detected profit_and_loss RawTable. Shares its
logic with balance_sheet_parser.py -- see statement_refinement.py.
"""

from app.services.ingestion.parsers import RawTable
from app.services.ingestion.parsers.statement_refinement import refine_statement_table


class ProfitAndLossParser:
    def refine(self, table: RawTable) -> RawTable:
        return refine_statement_table(table)
