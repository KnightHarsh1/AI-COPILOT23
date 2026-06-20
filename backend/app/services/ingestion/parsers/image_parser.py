"""Image parser (OCR). Many micro-owners photograph a sales register or
invoice. This OCRs the image into text lines and splits them into columns so
the normal detection + mapping pipeline can handle it. OCR accuracy varies,
so the user still confirms the mapping. Fails gracefully with a clear message
when the OCR engine isn't installed.
"""

from pathlib import Path
from typing import List

from app.services.ingestion.parsers import ParseError, RawTable


class ImageParser:
    def parse(self, file_path: Path) -> List[RawTable]:
        try:
            import pytesseract
            from PIL import Image
        except Exception as exc:
            raise ParseError(
                "Photo import needs OCR support (pytesseract + Pillow). "
                "Install them, or type the data into a CSV/Excel file instead."
            ) from exc

        try:
            text = pytesseract.image_to_string(Image.open(str(file_path)))
        except Exception as exc:
            raise ParseError(f"Could not read text from this image: {exc}") from exc

        lines = [ln for ln in text.splitlines() if ln.strip()]
        rows = [ln.split() for ln in lines]
        rows = [r for r in rows if len(r) >= 2]
        if len(rows) < 2:
            raise ParseError(
                "Couldn't find a clear table in this photo. Try a sharper image, "
                "or upload the data as CSV/Excel."
            )

        width = max(len(r) for r in rows)
        headers = [str(h) for h in rows[0]] + [f"col_{i}" for i in range(len(rows[0]), width)]
        body = [(r + [None] * width)[:width] for r in rows[1:]]
        return [RawTable(headers=headers, rows=body, sheet_name="Photo")]
