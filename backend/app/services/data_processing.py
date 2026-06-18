import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import Alert, Customer, Expense, InventoryItem, Metric, Report, Sale
from app.services.data_processing_rules import (
    COLUMN_ALIASES,
    DATASET_MAPPINGS,
    DATASET_MODEL_MAP,
    DATASET_RULES,
    SUPPORTED_EXTENSIONS,
)


class DataProcessingEngine:
    def __init__(self, session: Session):
        self.session = session

    @staticmethod
    def normalize_column_name(column_name: str) -> str:
        normalized = column_name.strip().lower().replace(' ', '_')
        return COLUMN_ALIASES.get(normalized, normalized)

    @staticmethod
    def load_dataframe(file_path: Path) -> pd.DataFrame:
        suffix = file_path.suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS:
            raise ValueError(f'Unsupported file extension: {suffix}')

        if suffix == '.csv':
            return pd.read_csv(file_path)

        return pd.read_excel(file_path)

    def normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.rename(columns={col: self.normalize_column_name(col) for col in df.columns})
        return df

    def validate_columns(self, df: pd.DataFrame, dataset_type: str) -> None:
        rules = DATASET_RULES.get(dataset_type)
        if rules is None:
            raise ValueError(f'Unknown dataset type: {dataset_type}')

        missing_columns = [
            column for column in rules['required_columns'] if column not in df.columns
        ]
        if missing_columns:
            raise ValueError(
                f"Missing required columns for {dataset_type}: {', '.join(missing_columns)}"
            )

    @staticmethod
    def clean_strings(df: pd.DataFrame) -> pd.DataFrame:
        object_columns = df.select_dtypes(include=['object']).columns
        for column in object_columns:
            df[column] = df[column].astype(str).str.strip().replace({'nan': None})
        return df

    @staticmethod
    def clean_dates(df: pd.DataFrame, date_columns: List[str]) -> pd.DataFrame:
        for column in date_columns:
            if column in df.columns:
                df[column] = pd.to_datetime(df[column], errors='coerce')
        return df

    @staticmethod
    def clean_numbers(df: pd.DataFrame, numeric_columns: List[str]) -> pd.DataFrame:
        for column in numeric_columns:
            if column in df.columns:
                df[column] = pd.to_numeric(df[column], errors='coerce')
        return df

    @staticmethod
    def clean_booleans(df: pd.DataFrame, bool_columns: List[str]) -> pd.DataFrame:
        for column in bool_columns:
            if column in df.columns:
                df[column] = df[column].astype(str).str.lower().map(
                    {
                        'true': True,
                        '1': True,
                        'yes': True,
                        'y': True,
                        'false': False,
                        '0': False,
                        'no': False,
                        'n': False,
                    }
                ).fillna(df[column])
        return df

    @staticmethod
    def clean_payload(df: pd.DataFrame, field_name: str) -> pd.DataFrame:
        if field_name not in df.columns:
            return df

        def parse_payload(value: Any) -> Any:
            if value is None or (isinstance(value, float) and pd.isna(value)):
                return None
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return value

        df[field_name] = df[field_name].apply(parse_payload)
        return df

    def standardize_values(self, df: pd.DataFrame, dataset_type: str) -> pd.DataFrame:
        if 'status' in df.columns:
            df['status'] = df['status'].astype(str).str.lower().str.strip()

        if dataset_type == 'alerts' and 'severity' in df.columns:
            df['severity'] = df['severity'].astype(str).str.lower().str.strip()

        return df

    def remove_duplicates(self, df: pd.DataFrame, dataset_type: str) -> pd.DataFrame:
        rules = DATASET_RULES[dataset_type]
        subset = [column for column in rules['dedupe_columns'] if column in df.columns]
        if not subset:
            return df
        return df.drop_duplicates(subset=subset, keep='first')

    def normalize_dataframe(self, df: pd.DataFrame, dataset_type: str) -> pd.DataFrame:
        df = self.normalize_columns(df)
        self.validate_columns(df, dataset_type)

        rules = DATASET_RULES[dataset_type]
        df = self.clean_strings(df)
        df = self.clean_dates(df, rules['date_columns'])
        df = self.clean_numbers(df, rules['numeric_columns'])
        df = self.clean_booleans(df, ['is_read'])
        df = self.clean_payload(df, 'payload')
        df = self.standardize_values(df, dataset_type)

        df = df.dropna(subset=rules['required_columns'])
        df = self.remove_duplicates(df, dataset_type)

        return df

    @staticmethod
    def get_model(dataset_type: str):
        mapping = {
            'sales': Sale,
            'expenses': Expense,
            'inventory': InventoryItem,
            'customers': Customer,
            'metrics': Metric,
            'alerts': Alert,
            'reports': Report,
        }
        model = mapping.get(dataset_type)
        if model is None:
            raise ValueError(f'Unsupported dataset type: {dataset_type}')
        return model

    def map_record(self, record: Dict[str, Any], dataset_type: str) -> Dict[str, Any]:
        mapping = DATASET_MAPPINGS[dataset_type]
        return {model_field: record.get(csv_field) for model_field, csv_field in mapping.items()}

    def persist_dataframe(self, df: pd.DataFrame, dataset_type: str) -> int:
        model = self.get_model(dataset_type)
        records = []
        for row in df.to_dict(orient='records'):
            mapped = self.map_record(row, dataset_type)
            record = model(**mapped)
            records.append(record)

        if not records:
            return 0

        self.session.add_all(records)
        self.session.commit()
        return len(records)

    def process_file(self, file_path: Path, dataset_type: str) -> int:
        df = self.load_dataframe(file_path)
        df = self.normalize_dataframe(df, dataset_type)
        return self.persist_dataframe(df, dataset_type)
