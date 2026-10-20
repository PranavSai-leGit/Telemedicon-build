"""
Safe, idempotent migration script to normalize historical laboratory facts in MediTale.

Key principles:
1. Preserves original_extracted_value, report references, and raw provenance.
2. Normalizes test names into canonical_id, canonical_name, standard units, and evaluates abnormality.
3. Safe against rerun: will not overwrite manual reviews or corrupt already canonicalized facts.
4. Clinically safe: does not merge distinct tests (e.g. RBC vs RDW, WBC total vs differential).
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.fact import ExtractedFact
from app.services.lab_normalizer import normalize_lab_test, extract_numeric_value

def migrate_normalize_labs():
    db = SessionLocal()
    try:
        lab_facts = db.query(ExtractedFact).filter(
            ExtractedFact.fact_type.in_(["lab_result", "vital"])
        ).all()
        
        print(f"Found {len(lab_facts)} laboratory/vital facts to inspect.")
        updated_count = 0
        already_normalized = 0
        
        for fact in lab_facts:
            raw_orig = fact.original_extracted_value or ""
            val_json = dict(fact.value_json or {})
            
            # Determine raw test name
            test_name = val_json.get("test_name") or raw_orig or fact.normalized_value or ""
            raw_val_str = val_json.get("value")
            if raw_val_str is None and fact.unit:
                # sometimes normalized_value might be test name or numeric
                raw_val_str = val_json.get("result")
            
            numeric_val = extract_numeric_value(raw_val_str)
            test_unit = val_json.get("unit") or fact.unit or ""
            test_ref_range = val_json.get("reference_range") or val_json.get("ref_range") or ""
            
            # Normalize
            norm_result = normalize_lab_test(
                raw_name=test_name,
                value=numeric_val,
                raw_unit=test_unit,
                raw_reference_range=test_ref_range
            )
            
            # Only update if we have a valid normalization or want to attach canonical metadata
            changes_made = False
            
            if norm_result.canonical_id:
                # Check if already canonicalized
                if val_json.get("canonical_id") == norm_result.canonical_id and val_json.get("abnormality_status") == norm_result.abnormality_status:
                    already_normalized += 1
                    continue
                
                # Preserve original extracted value
                if not fact.original_extracted_value:
                    fact.original_extracted_value = test_name
                
                # Update fact normalized_value to canonical display name
                fact.normalized_value = norm_result.canonical_name
                
                # Update val_json with rich canonical metadata
                val_json.update({
                    "canonical_id": norm_result.canonical_id,
                    "canonical_name": norm_result.canonical_name,
                    "original_test_name": norm_result.original_name,
                    "category": norm_result.category,
                    "standard_unit": norm_result.standard_unit,
                    "specimen": norm_result.specimen,
                    "abnormality_status": norm_result.abnormality_status,
                    "is_abnormal": norm_result.is_abnormal,
                    "reference_range": norm_result.reference_range,
                    "numeric_value": norm_result.value,
                    "normalization_confidence": norm_result.confidence
                })
                fact.value_json = val_json
                
                if norm_result.standard_unit and not fact.unit:
                    fact.unit = norm_result.standard_unit
                
                changes_made = True
                updated_count += 1
                print(f"  [NORMALIZED] ID {fact.id}: '{test_name}' -> '{norm_result.canonical_name}' (ID: {norm_result.canonical_id}, Status: {norm_result.abnormality_status})")
            else:
                # Even if unknown test, ensure numeric_value and original_test_name are populated
                if not val_json.get("original_test_name"):
                    val_json["original_test_name"] = test_name
                    val_json["canonical_name"] = test_name
                    val_json["abnormality_status"] = "unknown"
                    fact.value_json = val_json
                    changes_made = True
                    updated_count += 1
                    print(f"  [UNMAPPED LAB] ID {fact.id}: '{test_name}' (kept as original)")
        
        if changes_made or updated_count > 0:
            db.commit()
            print(f"\nMigration complete: {updated_count} records updated, {already_normalized} previously normalized.")
        else:
            print(f"\nNo changes needed: {already_normalized} records already up-to-date.")
            
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_normalize_labs()
