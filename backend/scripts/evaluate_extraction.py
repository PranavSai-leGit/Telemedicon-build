import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.gemini_service import gemini_service
from app.services.confidence_service import ConfidenceScoringService

def run_evaluation(fixtures_path: str = None) -> Dict[str, Any]:
    if not fixtures_path:
        fixtures_path = str(Path(__file__).resolve().parent / "benchmark_fixtures.json")

    with open(fixtures_path, "r", encoding="utf-8") as f:
        fixtures = json.load(f)

    print("=" * 70)
    print("MEDITALE REPRODUCIBLE EVALUATION FRAMEWORK")
    print(f"Loaded {len(fixtures)} benchmark clinical fixtures from {fixtures_path}")
    print("=" * 70)

    total_gt_meds = 0
    total_ext_meds = 0
    correct_meds = 0

    total_gt_conds = 0
    total_ext_conds = 0
    correct_conds = 0

    total_gt_labs = 0
    total_ext_labs = 0
    correct_labs = 0

    date_matches = 0
    total_dates = 0

    total_claims = 0
    claims_with_evidence = 0
    unsupported_claims = 0
    valid_schema_claims = 0

    confidence_scores = []
    latencies_ms = []

    per_document_results = []

    for item in fixtures:
        doc_id = item["benchmark_id"]
        title = item["title"]
        text = item["document_text"]
        gt = item["ground_truth"]

        t0 = time.perf_counter()
        # Run extraction
        extracted_data, gen_mode, model_id = gemini_service.extract_document_data(
            document_text=text,
            filename=f"{doc_id}.txt",
            pages=[(1, text)],
            file_path=None,
            mime_type="text/plain"
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(elapsed_ms)

        # 1. Medications Evaluation
        gt_med_names = {m["name"].lower() for m in gt.get("medications", [])}
        ext_med_names = set()
        total_gt_meds += len(gt_med_names)

        doc_claims_count = 0
        doc_conf_scores = []

        for med in extracted_data.get("medications", []):
            med_name = (med.get("name") or "").lower()
            ext_med_names.add(med_name)
            # Evaluate confidence
            conf = ConfidenceScoringService.evaluate_claim_confidence(
                fact_type="medication",
                normalized_value=med.get("name", ""),
                value_json=med,
                source_excerpt=med.get("source_excerpt"),
                source_text=text,
                source_page=1,
                document_date=extracted_data.get("document_date"),
                event_date=extracted_data.get("event_date"),
                is_ocr=False
            )
            doc_conf_scores.append(conf["score"])
            confidence_scores.append(conf["score"])
            total_claims += 1
            doc_claims_count += 1
            if conf["has_evidence"]:
                claims_with_evidence += 1
            else:
                unsupported_claims += 1
            if conf["breakdown"]["schema_validity"] >= 10:
                valid_schema_claims += 1

        total_ext_meds += len(ext_med_names)
        # Match check
        for gt_m in gt_med_names:
            if any(gt_m in em or em in gt_m for em in ext_med_names):
                correct_meds += 1

        # 2. Conditions Evaluation
        gt_cond_names = {c["name"].lower() for c in gt.get("conditions", [])}
        ext_cond_names = set()
        total_gt_conds += len(gt_cond_names)

        for cond in extracted_data.get("conditions", []):
            cond_name = (cond.get("name") or "").lower()
            ext_cond_names.add(cond_name)
            conf = ConfidenceScoringService.evaluate_claim_confidence(
                fact_type="condition",
                normalized_value=cond.get("name", ""),
                value_json=cond,
                source_excerpt=cond.get("source_excerpt"),
                source_text=text,
                source_page=1,
                document_date=extracted_data.get("document_date"),
                event_date=extracted_data.get("event_date"),
                is_ocr=False
            )
            doc_conf_scores.append(conf["score"])
            confidence_scores.append(conf["score"])
            total_claims += 1
            doc_claims_count += 1
            if conf["has_evidence"]:
                claims_with_evidence += 1
            else:
                unsupported_claims += 1
            if conf["breakdown"]["schema_validity"] >= 10:
                valid_schema_claims += 1

        total_ext_conds += len(ext_cond_names)
        for gt_c in gt_cond_names:
            if any(gt_c in ec or ec in gt_c for ec in ext_cond_names):
                correct_conds += 1

        # 3. Lab Tests Evaluation
        gt_lab_names = {l["name"].lower() for l in gt.get("lab_tests", [])}
        ext_lab_names = set()
        total_gt_labs += len(gt_lab_names)

        for lab in extracted_data.get("lab_tests", []):
            lab_name = (lab.get("name") or "").lower()
            ext_lab_names.add(lab_name)
            conf = ConfidenceScoringService.evaluate_claim_confidence(
                fact_type="lab_result",
                normalized_value=lab.get("name", ""),
                value_json=lab,
                source_excerpt=lab.get("source_excerpt"),
                source_text=text,
                source_page=1,
                document_date=extracted_data.get("document_date"),
                event_date=extracted_data.get("event_date"),
                is_ocr=False
            )
            doc_conf_scores.append(conf["score"])
            confidence_scores.append(conf["score"])
            total_claims += 1
            doc_claims_count += 1
            if conf["has_evidence"]:
                claims_with_evidence += 1
            else:
                unsupported_claims += 1
            if conf["breakdown"]["schema_validity"] >= 10:
                valid_schema_claims += 1

        total_ext_labs += len(ext_lab_names)
        for gt_l in gt_lab_names:
            if any(gt_l in el or el in gt_l for el in ext_lab_names):
                correct_labs += 1

        # 4. Date check
        if gt.get("document_date"):
            total_dates += 1
            if extracted_data.get("document_date") == gt["document_date"]:
                date_matches += 1

        avg_doc_conf = (sum(doc_conf_scores) / len(doc_conf_scores)) if doc_conf_scores else 0.0

        per_document_results.append({
            "doc_id": doc_id,
            "title": title,
            "latency_ms": round(elapsed_ms, 1),
            "claims_extracted": doc_claims_count,
            "average_confidence": round(avg_doc_conf, 1),
            "mode": gen_mode,
            "model": model_id
        })

    # Metrics calculation
    med_prec = (correct_meds / total_ext_meds) if total_ext_meds else 1.0
    med_rec = (correct_meds / total_gt_meds) if total_gt_meds else 1.0
    med_f1 = (2 * med_prec * med_rec / (med_prec + med_rec)) if (med_prec + med_rec) else 0.0

    cond_prec = (correct_conds / total_ext_conds) if total_ext_conds else 1.0
    cond_rec = (correct_conds / total_gt_conds) if total_gt_conds else 1.0
    cond_f1 = (2 * cond_prec * cond_rec / (cond_prec + cond_rec)) if (cond_prec + cond_rec) else 0.0

    lab_prec = (correct_labs / total_ext_labs) if total_ext_labs else 1.0
    lab_rec = (correct_labs / total_gt_labs) if total_gt_labs else 1.0
    lab_f1 = (2 * lab_prec * lab_rec / (lab_prec + lab_rec)) if (lab_prec + lab_rec) else 0.0

    date_acc = (date_matches / total_dates) if total_dates else 1.0
    evidence_rate = (claims_with_evidence / total_claims) if total_claims else 1.0
    unsupported_rate = (unsupported_claims / total_claims) if total_claims else 0.0
    schema_valid_rate = (valid_schema_claims / total_claims) if total_claims else 1.0

    overall_avg_conf = (sum(confidence_scores) / len(confidence_scores)) if confidence_scores else 0.0
    avg_latency = (sum(latencies_ms) / len(latencies_ms)) if latencies_ms else 0.0

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "fixtures_evaluated": len(fixtures),
        "total_claims_extracted": total_claims,
        "metrics": {
            "medication_precision": round(med_prec, 3),
            "medication_recall": round(med_rec, 3),
            "medication_f1": round(med_f1, 3),
            "condition_precision": round(cond_prec, 3),
            "condition_recall": round(cond_rec, 3),
            "condition_f1": round(cond_f1, 3),
            "lab_precision": round(lab_prec, 3),
            "lab_recall": round(lab_rec, 3),
            "lab_f1": round(lab_f1, 3),
            "date_accuracy": round(date_acc, 3),
            "evidence_support_rate": round(evidence_rate, 3),
            "unsupported_claim_rate": round(unsupported_rate, 3),
            "schema_validity_rate": round(schema_valid_rate, 3),
            "average_confidence_score": round(overall_avg_conf, 1),
            "average_latency_ms": round(avg_latency, 1),
            "estimated_cost_per_doc_usd": 0.0001
        },
        "per_document": per_document_results
    }

    # Print summary
    print(f"\n--- EVALUATION METRICS REPORT ---")
    print(f"Medications : Precision: {med_prec:.1%}, Recall: {med_rec:.1%}, F1: {med_f1:.3f}")
    print(f"Conditions  : Precision: {cond_prec:.1%}, Recall: {cond_rec:.1%}, F1: {cond_f1:.3f}")
    print(f"Lab Results : Precision: {lab_prec:.1%}, Recall: {lab_rec:.1%}, F1: {lab_f1:.3f}")
    print(f"Date Match  : {date_acc:.1%}")
    print(f"Evidence Support Rate : {evidence_rate:.1%} (Unsupported: {unsupported_rate:.1%})")
    print(f"Schema Validity Rate  : {schema_valid_rate:.1%}")
    print(f"Average Confidence    : {overall_avg_conf:.1f}/100")
    print(f"Average Latency       : {avg_latency:.1f}ms per document")
    print("=" * 70)

    # Save output report
    output_path = Path(__file__).resolve().parent / "evaluation_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved evaluation results to {output_path}")

    return report

if __name__ == "__main__":
    run_evaluation()
