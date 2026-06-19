from pathlib import Path
from typing import List

import pandas as pd

from app.services.ingestion.parsers import ParseError, RawTable


class CSVParser:
    """Generalizes the CSV branch of upload.py::_load_dataframe into the
    new RawTable interface. A CSV is always a single "sheet"."""

    def parse(self, file_path: Path) -> List[RawTable]:
        try:
            df = pd.read_csv(file_path)
        except Exception as exc:
            raise ParseError(f"Could not read CSV file: {exc}") from exc

        df.columns = [str(col).strip() for col in df.columns]
        headers = list(df.columns)
        rows = df.where(pd.notnull(df), None).values.tolist()

        return [RawTable(headers=headers, rows=rows, sheet_name=None)]
