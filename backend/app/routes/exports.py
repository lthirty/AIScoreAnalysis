from base64 import b64encode
from html import escape
from io import BytesIO
from urllib.parse import quote

from fastapi import APIRouter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.schemas import ReportPdfExportRequest

router = APIRouter(prefix="/api", tags=["exports"])

try:
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
except Exception:
    pass


@router.post("/export-report-pdf")
def export_report_pdf(payload: ReportPdfExportRequest) -> dict[str, str]:
    pdf_bytes = build_report_pdf(payload.title, payload.content)
    filename = sanitize_filename(payload.filename or "AI成绩分析报告.pdf")
    return {
        "filename": filename,
        "mime_type": "application/pdf",
        "pdf_base64": b64encode(pdf_bytes).decode("ascii"),
        "download_name": filename,
        "content_disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
    }


def build_report_pdf(title: str, content: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontName="STSong-Light",
        fontSize=18,
        leading=24,
        textColor=colors.HexColor("#111827"),
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        name="ReportBody",
        parent=styles["BodyText"],
        fontName="STSong-Light",
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#1f2937"),
    )

    story = [Paragraph(escape(title or "AI成绩分析报告"), title_style), Spacer(1, 8)]
    blocks = [block.strip() for block in (content or "").split("\n\n") if block.strip()]
    if not blocks:
        blocks = ["暂无内容"]

    for index, block in enumerate(blocks):
        story.append(Paragraph(escape(block).replace("\n", "<br/>"), body_style))
        if index < len(blocks) - 1:
            story.append(Spacer(1, 8))

    doc.build(story)
    return buffer.getvalue()


def sanitize_filename(filename: str) -> str:
    cleaned = filename.strip().replace("/", "_").replace("\\", "_")
    return cleaned or "AI成绩分析报告.pdf"
