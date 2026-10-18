import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from typing import Dict, Any, List

def generate_clinical_handover_pdf(
    patient_name: str,
    clinician_name: str,
    summary_payload: Dict[str, Any],
    discrepancies: List[Dict[str, Any]]
) -> io.BytesIO:
    """
    Generate a formatted clinical handover PDF using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    teal_dark = colors.HexColor("#0f766e")
    teal_light = colors.HexColor("#ccfbf1")
    slate_dark = colors.HexColor("#1e293b")
    slate_gray = colors.HexColor("#64748b")
    amber_box = colors.HexColor("#fef3c7")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=teal_dark,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=slate_gray,
        spaceAfter=12
    )
    section_heading = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=slate_dark,
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=slate_dark
    )
    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=slate_dark,
        leftIndent=12,
        spaceAfter=4
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=slate_gray
    )

    elements = []

    # Header
    elements.append(Paragraph("MediTale — Clinical Handover Report", title_style))
    elements.append(Paragraph(
        f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')} | Authorized Clinician: Dr. {clinician_name}",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=teal_dark, spaceAfter=10))

    # Patient Details Banner
    patient_info = [
        [Paragraph(f"<b>Patient Name:</b> {patient_name}", body_style),
         Paragraph(f"<b>Platform:</b> MediTale Clinical Node", body_style)],
        [Paragraph(f"<b>Consent Status:</b> Active Explicit Grant", body_style),
         Paragraph(f"<b>Verification Level:</b> Evidence-Linked Multi-Provider", body_style)]
    ]
    info_table = Table(patient_info, colWidths=[260, 260])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), teal_light),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10))

    # Executive Summary
    elements.append(Paragraph("1. Executive Clinical Summary", section_heading))
    exec_summary = summary_payload.get("executive_summary", "Consolidated chronological patient handover.")
    elements.append(Paragraph(exec_summary, body_style))
    elements.append(Spacer(1, 8))

    # Relevant Medical History
    history_items = summary_payload.get("relevant_history", [])
    if history_items:
        elements.append(Paragraph("2. Documented Medical Conditions", section_heading))
        for item in history_items:
            claim = item.get("claim_text", "")
            fids = item.get("supporting_fact_ids", [])
            cite = f" <i>[Fact #{', '.join(map(str, fids))}]</i>" if fids else ""
            elements.append(Paragraph(f"• {claim}{cite}", bullet_style))
        elements.append(Spacer(1, 8))

    # Medications
    med_items = summary_payload.get("medications", [])
    if med_items:
        elements.append(Paragraph("3. Active & Documented Medications", section_heading))
        for item in med_items:
            claim = item.get("claim_text", "")
            fids = item.get("supporting_fact_ids", [])
            cite = f" <i>[Fact #{', '.join(map(str, fids))}]</i>" if fids else ""
            elements.append(Paragraph(f"• {claim}{cite}", bullet_style))
        elements.append(Spacer(1, 8))

    # Allergies
    allergy_items = summary_payload.get("allergies", [])
    if allergy_items:
        elements.append(Paragraph("4. Recorded Adverse Reactions & Allergies", section_heading))
        for item in allergy_items:
            claim = item.get("claim_text", "")
            elements.append(Paragraph(f"• <b>ALLERGY:</b> {claim}", bullet_style))
        elements.append(Spacer(1, 8))

    # Laboratory Trends
    lab_items = summary_payload.get("laboratory_measurements", [])
    if lab_items:
        elements.append(Paragraph("5. Key Diagnostic & Laboratory Findings", section_heading))
        for item in lab_items:
            claim = item.get("claim_text", "")
            fids = item.get("supporting_fact_ids", [])
            cite = f" <i>[Fact #{', '.join(map(str, fids))}]</i>" if fids else ""
            elements.append(Paragraph(f"• {claim}{cite}", bullet_style))
        elements.append(Spacer(1, 8))

    # Flagged Discrepancies
    if discrepancies:
        elements.append(Paragraph("6. Reconciliation & Potential Discrepancies", section_heading))
        for d in discrepancies:
            expl = d.get("explanation", "")
            status_text = d.get("review_status", "needs_review").replace("_", " ").title()
            note = d.get("review_note")
            note_str = f" | Review Note: '{note}'" if note else ""
            elements.append(Paragraph(f"• <b>Status [{status_text}]:</b> {expl}{note_str}", bullet_style))
        elements.append(Spacer(1, 10))

    # Non-liability Disclaimer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.gray, spaceAfter=6))
    elements.append(Paragraph(
        "<b>CLINICAL NOTICE:</b> This clinical handover report was generated by MediTale based on synthetic demo data for "
        "digital health interoperability demonstration. It does not replace independent licensed clinical judgment or "
        "direct patient consultation. All extracted facts should be verified against original medical records.",
        disclaimer_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
