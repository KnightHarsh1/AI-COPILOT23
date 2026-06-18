from pathlib import Path
from datetime import datetime

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet


class PDFService:

    @staticmethod
    def generate_report(report_text: str):

        reports_dir = Path("generated_reports")
        reports_dir.mkdir(exist_ok=True)

        filename = (
            f"business_report_"
            f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        )

        file_path = reports_dir / filename

        doc = SimpleDocTemplate(str(file_path))

        styles = getSampleStyleSheet()

        content = [
            Paragraph("Business Copilot Report", styles["Title"]),
            Spacer(1, 20),
            Paragraph(report_text.replace("\n", "<br/>"), styles["BodyText"]),
        ]

        doc.build(content)

        return filename