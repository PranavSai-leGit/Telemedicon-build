import sys
import os
import uuid
from datetime import datetime, timezone, date, timedelta
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import engine, SessionLocal, Base
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.discrepancy import Discrepancy
from app.models.summary import Summary
from app.models.enums import (
    UserRole,
    DocumentType,
    ProcessingStatus,
    FactType,
    ExtractionStatus,
    VerificationStatus,
    SharingStatus,
    DiscrepancyType,
    DiscrepancyReviewStatus
)
from app.security.passwords import hash_password
from app.services.document_parser import calculate_sha256
from app.core.config import settings

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def create_sample_pdf(filepath: str, title: str, lines: list[str]):
    """Generate a clean synthetic PDF for demonstration storage."""
    doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"<b>{title}</b>", styles["Heading1"]),
        Spacer(1, 12)
    ]
    for line in lines:
        story.append(Paragraph(line, styles["Normal"]))
        story.append(Spacer(1, 6))
    doc.build(story)

def seed_database():
    print("Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        existing_patient = db.query(User).filter(User.email == "patient@meditale.demo").first()
        if existing_patient:
            print("Demo data already seeded! Cleaning and re-seeding fresh demonstration state...")
            # Delete demo records
            db.query(User).filter(User.email.in_([
                "patient@meditale.demo",
                "clinician@meditale.demo",
                "admin@meditale.demo"
            ])).delete()
            db.commit()

        print("Seeding demo accounts...")
        default_pw = hash_password("Password123!")

        # 1. Patient Account
        patient = User(
            full_name="Eleanor Vance",
            email="patient@meditale.demo",
            password_hash=default_pw,
            role=UserRole.PATIENT.value,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(patient)

        # 2. Clinician Account
        clinician = User(
            full_name="Dr. Marcus Chen, MD",
            email="clinician@meditale.demo",
            password_hash=default_pw,
            role=UserRole.CLINICIAN.value,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(clinician)

        # 3. Administrator Account
        admin = User(
            full_name="Sarah Jenkins",
            email="admin@meditale.demo",
            password_hash=default_pw,
            role=UserRole.ADMINISTRATOR.value,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(admin)

        db.commit()
        db.refresh(patient)
        db.refresh(clinician)
        db.refresh(admin)

        print(f"Created Patient ID: {patient.id}, Clinician ID: {clinician.id}, Admin ID: {admin.id}")

        # Ensure storage directory exists
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)

        # Synthetic Document 1: Initial Metformin Prescription
        doc1_filename = "Prescription_Metformin_20261005.pdf"
        doc1_storage = f"{uuid.uuid4().hex}.pdf"
        doc1_path = os.path.join(settings.STORAGE_DIR, doc1_storage)
        create_sample_pdf(
            doc1_path,
            "METROPOLITAN HEALTH CLINIC — OUTPATIENT PRESCRIPTION",
            [
                "Patient: Eleanor Vance | DOB: 1982-04-12 | Date: 2026-10-05",
                "Prescriber: Dr. Rajiv Patel, MD (Lic #MD-98214)",
                "Diagnosis: Type 2 Diabetes Mellitus",
                "Rx: Metformin Hydrochloride 500 mg tablets",
                "Sig: Take 500 mg twice daily (BID) orally with morning and evening meals.",
                "Dispense: 60 tablets | Refills: 3",
                "Allergies: Penicillin (severe urticaria/rash)"
            ]
        )
        doc1_sha = calculate_sha256(doc1_path)

        doc1 = Document(
            patient_id=patient.id,
            uploaded_filename=doc1_filename,
            storage_filename=doc1_storage,
            storage_path=doc1_path,
            mime_type="application/pdf",
            size_bytes=os.path.getsize(doc1_path),
            sha256_hash=doc1_sha,
            document_type=DocumentType.PRESCRIPTION.value,
            processing_status=ProcessingStatus.COMPLETED.value,
            extracted_text="Patient: Eleanor Vance Date: 2026-10-05 Diagnosis: Type 2 Diabetes Mellitus. Rx: Metformin Hydrochloride 500 mg tablets. Sig: Take 500 mg twice daily with meals. Allergies: Penicillin.",
            extracted_data={
                "document_type": "prescription",
                "document_date": "2026-10-05",
                "event_date": "2026-10-05",
                "medications": [
                    {
                        "name": "Metformin Hydrochloride",
                        "dosage": "500 mg",
                        "frequency": "twice daily",
                        "instructions": "Take 500 mg twice daily orally with meals.",
                        "source_page": 1,
                        "source_excerpt": "Metformin Hydrochloride 500 mg tablets. Sig: Take 500 mg twice daily with meals."
                    }
                ],
                "conditions": [
                    {"name": "Type 2 Diabetes Mellitus", "status": "active", "source_page": 1, "source_excerpt": "Diagnosis: Type 2 Diabetes Mellitus"}
                ],
                "allergies": [
                    {"allergen": "Penicillin", "reaction": "severe urticaria/rash", "source_page": 1, "source_excerpt": "Allergies: Penicillin (severe urticaria/rash)"}
                ],
                "missing_fields": [],
                "uncertain_fields": []
            },
            document_date=date(2026, 10, 5),
            event_date=date(2026, 10, 5),
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db.add(doc1)
        db.commit()
        db.refresh(doc1)

        # Synthetic Document 2: Cardiovascular Lisinopril Prescription
        doc2_filename = "Prescription_Lisinopril_20260912.pdf"
        doc2_storage = f"{uuid.uuid4().hex}.pdf"
        doc2_path = os.path.join(settings.STORAGE_DIR, doc2_storage)
        create_sample_pdf(
            doc2_path,
            "CARDIOVASCULAR ASSOCIATES — CLINICAL PRESCRIPTION",
            [
                "Patient: Eleanor Vance | Date: 2026-09-12",
                "Prescriber: Dr. Elena Rostova, FACC",
                "Diagnosis: Essential Hypertension",
                "Rx: Lisinopril 10 mg Oral Tablets",
                "Sig: Take 10 mg once daily every morning with water.",
                "Dispense: 30 tablets | Refills: 5"
            ]
        )
        doc2_sha = calculate_sha256(doc2_path)

        doc2 = Document(
            patient_id=patient.id,
            uploaded_filename=doc2_filename,
            storage_filename=doc2_storage,
            storage_path=doc2_path,
            mime_type="application/pdf",
            size_bytes=os.path.getsize(doc2_path),
            sha256_hash=doc2_sha,
            document_type=DocumentType.PRESCRIPTION.value,
            processing_status=ProcessingStatus.COMPLETED.value,
            extracted_text="Patient: Eleanor Vance Date: 2026-09-12 Diagnosis: Essential Hypertension. Rx: Lisinopril 10 mg. Sig: Take 10 mg once daily every morning.",
            extracted_data={
                "document_type": "prescription",
                "document_date": "2026-09-12",
                "event_date": "2026-09-12",
                "medications": [
                    {
                        "name": "Lisinopril",
                        "dosage": "10 mg",
                        "frequency": "once daily",
                        "instructions": "Take 10 mg once daily in the morning.",
                        "source_page": 1,
                        "source_excerpt": "Lisinopril 10 mg Oral Tablets. Sig: Take 10 mg once daily every morning."
                    }
                ],
                "conditions": [
                    {"name": "Essential Hypertension", "status": "active", "source_page": 1, "source_excerpt": "Diagnosis: Essential Hypertension"}
                ],
                "missing_fields": [],
                "uncertain_fields": []
            },
            document_date=date(2026, 9, 12),
            event_date=date(2026, 9, 12),
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=25)
        )
        db.add(doc2)
        db.commit()
        db.refresh(doc2)

        # Synthetic Document 3: Laboratory Metabolic Panel
        doc3_filename = "Laboratory_Metabolic_Panel_20261010.pdf"
        doc3_storage = f"{uuid.uuid4().hex}.pdf"
        doc3_path = os.path.join(settings.STORAGE_DIR, doc3_storage)
        create_sample_pdf(
            doc3_path,
            "QUEST DIAGNOSTICS — COMPREHENSIVE METABOLIC REPORT",
            [
                "Patient: Eleanor Vance | Collection Date: 2026-10-10 | Reported: 2026-10-11",
                "Ordering Physician: Dr. Rajiv Patel, MD",
                "TEST RESULTS:",
                "• Hemoglobin A1c (HbA1c): 7.8 % (Reference: < 5.7 %, Target: < 7.0 %) [HIGH]",
                "• Fasting Plasma Glucose: 142 mg/dL (Reference: 70 - 99 mg/dL) [HIGH]",
                "• Serum Creatinine: 1.05 mg/dL (Reference: 0.6 - 1.2 mg/dL) [NORMAL]",
                "• eGFR: 84 mL/min/1.73m2 (Reference: > 60 mL/min/1.73m2) [NORMAL]",
                "• LDL Cholesterol: 128 mg/dL (Reference: < 100 mg/dL) [ELEVATED]",
                "Clinical Note: Suboptimal glycemic control on current dosage. Consider medication adjustment."
            ]
        )
        doc3_sha = calculate_sha256(doc3_path)

        doc3 = Document(
            patient_id=patient.id,
            uploaded_filename=doc3_filename,
            storage_filename=doc3_storage,
            storage_path=doc3_path,
            mime_type="application/pdf",
            size_bytes=os.path.getsize(doc3_path),
            sha256_hash=doc3_sha,
            document_type=DocumentType.LABORATORY_REPORT.value,
            processing_status=ProcessingStatus.COMPLETED.value,
            extracted_text="Hemoglobin A1c: 7.8% (Target < 7.0%). Fasting Glucose: 142 mg/dL. Serum Creatinine: 1.05 mg/dL. LDL: 128 mg/dL.",
            extracted_data={
                "document_type": "laboratory_report",
                "document_date": "2026-10-10",
                "event_date": "2026-10-10",
                "lab_tests": [
                    {"name": "HbA1c (Glycated Hemoglobin)", "value": 7.8, "unit": "%", "reference_range": "< 5.7%", "source_page": 1, "source_excerpt": "Hemoglobin A1c (HbA1c): 7.8 % (Reference: < 5.7 %)"},
                    {"name": "Fasting Blood Glucose", "value": 142.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "source_page": 1, "source_excerpt": "Fasting Plasma Glucose: 142 mg/dL"},
                    {"name": "Serum Creatinine", "value": 1.05, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "source_page": 1, "source_excerpt": "Serum Creatinine: 1.05 mg/dL"},
                    {"name": "LDL Cholesterol", "value": 128.0, "unit": "mg/dL", "reference_range": "< 100 mg/dL", "source_page": 1, "source_excerpt": "LDL Cholesterol: 128 mg/dL (Reference: < 100 mg/dL)"}
                ],
                "missing_fields": [],
                "uncertain_fields": []
            },
            document_date=date(2026, 10, 10),
            event_date=date(2026, 10, 10),
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=6)
        )
        db.add(doc3)
        db.commit()
        db.refresh(doc3)

        # Synthetic Document 4: Discharge Summary
        doc4_filename = "Hospital_Discharge_Summary_20260814.pdf"
        doc4_storage = f"{uuid.uuid4().hex}.pdf"
        doc4_path = os.path.join(settings.STORAGE_DIR, doc4_storage)
        create_sample_pdf(
            doc4_path,
            "ST. JUDE MEMORIAL HOSPITAL — DISCHARGE SUMMARY",
            [
                "Patient: Eleanor Vance | Admission: 2026-08-11 | Discharge: 2026-08-14",
                "Admitting Diagnosis: Acute Gastroenteritis with mild volume depletion",
                "Discharge Diagnoses: 1. Resolved Acute Viral Gastroenteritis 2. Type 2 Diabetes 3. Hypertension",
                "Hospital Course: IV hydration initiated. Home medications resumed prior to discharge.",
                "Documented Allergy: Penicillin — severe hives.",
                "Follow-up: Follow up with primary care physician within 2 weeks."
            ]
        )
        doc4_sha = calculate_sha256(doc4_path)

        doc4 = Document(
            patient_id=patient.id,
            uploaded_filename=doc4_filename,
            storage_filename=doc4_storage,
            storage_path=doc4_path,
            mime_type="application/pdf",
            size_bytes=os.path.getsize(doc4_path),
            sha256_hash=doc4_sha,
            document_type=DocumentType.DISCHARGE_SUMMARY.value,
            processing_status=ProcessingStatus.COMPLETED.value,
            extracted_text="Admitted 2026-08-11, Discharged 2026-08-14. Diagnoses: Viral Gastroenteritis (resolved), Type 2 Diabetes, Hypertension. Allergy: Penicillin.",
            extracted_data={
                "document_type": "discharge_summary",
                "document_date": "2026-08-14",
                "event_date": "2026-08-14",
                "conditions": [
                    {"name": "Acute Viral Gastroenteritis", "status": "resolved", "source_page": 1, "source_excerpt": "1. Resolved Acute Viral Gastroenteritis"},
                    {"name": "Type 2 Diabetes Mellitus", "status": "active", "source_page": 1, "source_excerpt": "2. Type 2 Diabetes"},
                    {"name": "Essential Hypertension", "status": "active", "source_page": 1, "source_excerpt": "3. Hypertension"}
                ],
                "allergies": [
                    {"allergen": "Penicillin", "reaction": "severe hives", "source_page": 1, "source_excerpt": "Documented Allergy: Penicillin — severe hives"}
                ],
                "missing_fields": [],
                "uncertain_fields": []
            },
            document_date=date(2026, 8, 14),
            event_date=date(2026, 8, 14),
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=40)
        )
        db.add(doc4)
        db.commit()
        db.refresh(doc4)

        # Synthetic Document 5: Adjusted Metformin Prescription (Triggers Real Discrepancy!)
        doc5_filename = "Prescription_Metformin_Adjusted_20261015.pdf"
        doc5_storage = f"{uuid.uuid4().hex}.pdf"
        doc5_path = os.path.join(settings.STORAGE_DIR, doc5_storage)
        create_sample_pdf(
            doc5_path,
            "TELEHEALTH ENDOCRINOLOGY CONSULTATION — PRESCRIPTION",
            [
                "Patient: Eleanor Vance | Date: 2026-10-15",
                "Consultant: Dr. Anita Sharma, MD",
                "Reason: Uncontrolled blood glucose (HbA1c 7.8%)",
                "Rx: Metformin Extended-Release (XR) 1000 mg tablets",
                "Sig: Take 1000 mg once daily (QD) orally with dinner.",
                "Dispense: 30 tablets | Note: Discontinue previous 500 mg BID regimen to prevent overlap."
            ]
        )
        doc5_sha = calculate_sha256(doc5_path)

        doc5 = Document(
            patient_id=patient.id,
            uploaded_filename=doc5_filename,
            storage_filename=doc5_storage,
            storage_path=doc5_path,
            mime_type="application/pdf",
            size_bytes=os.path.getsize(doc5_path),
            sha256_hash=doc5_sha,
            document_type=DocumentType.PRESCRIPTION.value,
            processing_status=ProcessingStatus.COMPLETED.value,
            extracted_text="Patient: Eleanor Vance Date: 2026-10-15. Rx: Metformin XR 1000 mg once daily with dinner. Discontinue previous 500mg BID.",
            extracted_data={
                "document_type": "prescription",
                "document_date": "2026-10-15",
                "event_date": "2026-10-15",
                "medications": [
                    {
                        "name": "Metformin Extended-Release (XR)",
                        "dosage": "1000 mg",
                        "frequency": "once daily with dinner",
                        "instructions": "Take 1000 mg once daily with dinner.",
                        "source_page": 1,
                        "source_excerpt": "Metformin Extended-Release (XR) 1000 mg tablets. Sig: Take 1000 mg once daily with dinner."
                    }
                ],
                "missing_fields": [],
                "uncertain_fields": []
            },
            document_date=date(2026, 10, 15),
            event_date=date(2026, 10, 15),
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add(doc5)
        db.commit()
        db.refresh(doc5)

        # Seed normalized facts
        # Fact 1: Metformin 500mg (Doc 1)
        f_met_500 = ExtractedFact(
            patient_id=patient.id,
            document_id=doc1.id,
            fact_type=FactType.MEDICATION.value,
            normalized_value="Metformin Hydrochloride 500mg",
            value_json={"dosage": "500 mg", "frequency": "twice daily", "instructions": "Take 500 mg twice daily orally with meals."},
            event_date=date(2026, 10, 5),
            source_page=1,
            source_excerpt="Metformin Hydrochloride 500 mg tablets. Sig: Take 500 mg twice daily with meals.",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db.add(f_met_500)

        # Fact 2: Type 2 Diabetes Condition (Doc 1)
        f_cond_dm = ExtractedFact(
            patient_id=patient.id,
            document_id=doc1.id,
            fact_type=FactType.CONDITION.value,
            normalized_value="Type 2 Diabetes Mellitus",
            value_json={"name": "Type 2 Diabetes Mellitus", "status": "active"},
            event_date=date(2026, 10, 5),
            source_page=1,
            source_excerpt="Diagnosis: Type 2 Diabetes Mellitus",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.CLINICIAN_VERIFIED.value,
            reviewed_by=clinician.id,
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=4),
            created_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db.add(f_cond_dm)

        # Fact 3: Penicillin Allergy (Doc 1)
        f_all_pen = ExtractedFact(
            patient_id=patient.id,
            document_id=doc1.id,
            fact_type=FactType.ALLERGY.value,
            normalized_value="Penicillin Allergy",
            value_json={"allergen": "Penicillin", "reaction": "severe urticaria/rash"},
            event_date=date(2026, 10, 5),
            source_page=1,
            source_excerpt="Allergies: Penicillin (severe urticaria/rash)",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.CLINICIAN_VERIFIED.value,
            reviewed_by=clinician.id,
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=4),
            created_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db.add(f_all_pen)

        # Fact 4: Lisinopril 10mg (Doc 2)
        f_lis = ExtractedFact(
            patient_id=patient.id,
            document_id=doc2.id,
            fact_type=FactType.MEDICATION.value,
            normalized_value="Lisinopril 10mg",
            value_json={"dosage": "10 mg", "frequency": "once daily", "instructions": "Take 10 mg once daily in the morning."},
            event_date=date(2026, 9, 12),
            source_page=1,
            source_excerpt="Lisinopril 10 mg Oral Tablets. Sig: Take 10 mg once daily every morning.",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.PATIENT_CONFIRMED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=25)
        )
        db.add(f_lis)

        # Fact 5: Essential Hypertension Condition (Doc 2)
        f_cond_htn = ExtractedFact(
            patient_id=patient.id,
            document_id=doc2.id,
            fact_type=FactType.CONDITION.value,
            normalized_value="Essential Hypertension",
            value_json={"name": "Essential Hypertension", "status": "active"},
            event_date=date(2026, 9, 12),
            source_page=1,
            source_excerpt="Diagnosis: Essential Hypertension",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=25)
        )
        db.add(f_cond_htn)

        # Fact 6: Lab HbA1c 7.8% (Doc 3)
        f_lab_hba1c = ExtractedFact(
            patient_id=patient.id,
            document_id=doc3.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value="HbA1c (Glycated Hemoglobin)",
            value_json={"value": 7.8, "unit": "%", "reference_range": "< 5.7%"},
            unit="%",
            event_date=date(2026, 10, 10),
            source_page=1,
            source_excerpt="Hemoglobin A1c (HbA1c): 7.8 % (Reference: < 5.7 %)",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.CLINICIAN_VERIFIED.value,
            reviewed_by=clinician.id,
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=4),
            created_at=datetime.now(timezone.utc) - timedelta(days=6)
        )
        db.add(f_lab_hba1c)

        # Fact 7: Lab Glucose 142 (Doc 3)
        f_lab_glu = ExtractedFact(
            patient_id=patient.id,
            document_id=doc3.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value="Fasting Blood Glucose",
            value_json={"value": 142.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL"},
            unit="mg/dL",
            event_date=date(2026, 10, 10),
            source_page=1,
            source_excerpt="Fasting Plasma Glucose: 142 mg/dL",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=6)
        )
        db.add(f_lab_glu)

        # Fact 8: Lab Creatinine 1.05 (Doc 3)
        f_lab_cr = ExtractedFact(
            patient_id=patient.id,
            document_id=doc3.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value="Serum Creatinine",
            value_json={"value": 1.05, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL"},
            unit="mg/dL",
            event_date=date(2026, 10, 10),
            source_page=1,
            source_excerpt="Serum Creatinine: 1.05 mg/dL",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=6)
        )
        db.add(f_lab_cr)

        # Fact 9: Lab LDL 128 (Doc 3)
        f_lab_ldl = ExtractedFact(
            patient_id=patient.id,
            document_id=doc3.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value="LDL Cholesterol",
            value_json={"value": 128.0, "unit": "mg/dL", "reference_range": "< 100 mg/dL"},
            unit="mg/dL",
            event_date=date(2026, 10, 10),
            source_page=1,
            source_excerpt="LDL Cholesterol: 128 mg/dL (Reference: < 100 mg/dL)",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=6)
        )
        db.add(f_lab_ldl)

        # Fact 10: Metformin 1000mg Adjusted (Doc 5)
        f_met_1000 = ExtractedFact(
            patient_id=patient.id,
            document_id=doc5.id,
            fact_type=FactType.MEDICATION.value,
            normalized_value="Metformin Extended-Release (XR) 1000mg",
            value_json={"dosage": "1000 mg", "frequency": "once daily with dinner", "instructions": "Take 1000 mg once daily with dinner."},
            event_date=date(2026, 10, 15),
            source_page=1,
            source_excerpt="Metformin Extended-Release (XR) 1000 mg tablets. Sig: Take 1000 mg once daily with dinner.",
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add(f_met_1000)

        db.commit()
        for f in [f_met_500, f_cond_dm, f_all_pen, f_lis, f_cond_htn, f_lab_hba1c, f_lab_glu, f_lab_cr, f_lab_ldl, f_met_1000]:
            db.refresh(f)

        # Seed Active Sharing Grant: Patient Eleanor Vance shares Docs 1, 2, 3, 5 with Dr. Marcus Chen
        grant = SharingGrant(
            patient_id=patient.id,
            clinician_id=clinician.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=3),
            expires_at=datetime.now(timezone.utc) + timedelta(days=27),
            revoked_at=None,
            status=SharingStatus.ACTIVE.value
        )
        db.add(grant)
        db.commit()
        db.refresh(grant)

        # Link Documents 1, 2, 3, 5 to Sharing Grant (Notice Doc 4 is intentionally omitted by patient to test consent scoping!)
        for doc in [doc1, doc2, doc3, doc5]:
            db.add(SharingGrantDocument(sharing_grant_id=grant.id, document_id=doc.id))
        db.commit()

        # Seed Flagged Medication Discrepancy between Metformin 500mg BID and Metformin 1000mg QD
        disc = Discrepancy(
            patient_id=patient.id,
            fact_id_1=f_met_500.id,
            fact_id_2=f_met_1000.id,
            discrepancy_type=DiscrepancyType.DOSAGE_MISMATCH.value,
            explanation=(
                "Potential discrepancy — review required. "
                "Record 1 (2026-10-05) specifies 'Metformin 500 mg twice daily with meals'. "
                "Record 2 (2026-10-15) specifies 'Metformin Extended-Release (XR) 1000 mg once daily with dinner'. "
                "Verify whether the patient has transitioned to the 1000mg XR daily regimen and ceased the 500mg BID dose."
            ),
            review_status=DiscrepancyReviewStatus.NEEDS_REVIEW.value,
            review_note=None,
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add(disc)
        db.commit()
        db.refresh(disc)

        # Seed initial Evidence-Linked Summary
        summary = Summary(
            patient_id=patient.id,
            generated_by=patient.id,
            included_document_ids=[doc1.id, doc2.id, doc3.id, doc5.id],
            summary_payload={
                "patient_name": "Eleanor Vance",
                "executive_summary": (
                    "Eleanor Vance is a 44-year-old female with established Type 2 Diabetes Mellitus and Essential Hypertension. "
                    "Recent laboratory results show suboptimal glycemic control with HbA1c at 7.8% and elevated fasting glucose at 142 mg/dL. "
                    "Records reflect an active medication adjustment from Metformin 500mg BID to Metformin XR 1000mg QD, accompanied by Lisinopril 10mg daily. "
                    "Penicillin allergy is documented with severe cutaneous manifestations."
                ),
                "relevant_history": [
                    {"claim_text": "Active diagnosis of Type 2 Diabetes Mellitus managed outpatient.", "category": "condition", "supporting_fact_ids": [f_cond_dm.id]},
                    {"claim_text": "Documented diagnosis of Essential Hypertension.", "category": "condition", "supporting_fact_ids": [f_cond_htn.id]}
                ],
                "medications": [
                    {"claim_text": "Prescribed Metformin XR 1000 mg daily (adjusted October 15, 2026).", "category": "medication", "supporting_fact_ids": [f_met_1000.id]},
                    {"claim_text": "Prescribed Lisinopril 10 mg daily for blood pressure control.", "category": "medication", "supporting_fact_ids": [f_lis.id]}
                ],
                "allergies": [
                    {"claim_text": "Severe documented allergy to Penicillin resulting in urticarial rash.", "category": "allergy", "supporting_fact_ids": [f_all_pen.id]}
                ],
                "laboratory_measurements": [
                    {"claim_text": "Suboptimal glycemic control reflected by HbA1c 7.8% on Oct 10, 2026.", "category": "lab_result", "supporting_fact_ids": [f_lab_hba1c.id]},
                    {"claim_text": "Fasting blood glucose elevated at 142 mg/dL.", "category": "lab_result", "supporting_fact_ids": [f_lab_glu.id]},
                    {"claim_text": "Serum creatinine within normal range at 1.05 mg/dL.", "category": "lab_result", "supporting_fact_ids": [f_lab_cr.id]},
                    {"claim_text": "Elevated LDL cholesterol at 128 mg/dL.", "category": "lab_result", "supporting_fact_ids": [f_lab_ldl.id]}
                ],
                "recent_events": [
                    {"claim_text": "Endocrinology consultation recommending transition to once-daily Metformin XR.", "category": "event", "supporting_fact_ids": [f_met_1000.id]}
                ],
                "missing_information": [
                    "Recent ophthalmology dilated eye exam record not present in shared files",
                    "Urine albumin-to-creatinine ratio (ACR) test pending"
                ],
                "potential_discrepancies": [
                    "Dosage transition between Metformin 500mg BID and Metformin 1000mg QD requires confirmation with patient."
                ]
            },
            generation_mode="demo",
            model_identifier="synthetic-demo-engine",
            created_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(summary)
        db.commit()

        print("Synthetic demo data seeded successfully!")
        print("Demo Accounts:")
        print("  1. Patient:   patient@meditale.demo   / Password123!")
        print("  2. Clinician: clinician@meditale.demo / Password123!")
        print("  3. Admin:     admin@meditale.demo     / Password123!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
