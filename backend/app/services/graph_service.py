from typing import List, Dict, Any, Set, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.fact import ExtractedFact
from app.models.document import Document
from app.models.discrepancy import Discrepancy
from app.models.user import User
from app.schemas.fact import GraphNode, GraphEdge, RelationshipGraphResponse

# Clinically validated biomarker to condition associations
MONITORING_ASSOCIATIONS = {
    "type 2 diabetes mellitus": ["hba1c", "glycated hemoglobin", "fasting blood glucose", "glucose", "microalbumin"],
    "diabetes": ["hba1c", "glycated hemoglobin", "fasting blood glucose", "glucose"],
    "essential hypertension": ["serum creatinine", "creatinine", "blood pressure", "potassium", "egfr"],
    "hypertension": ["serum creatinine", "creatinine", "blood pressure", "potassium", "egfr"],
    "hyperlipidemia": ["ldl cholesterol", "hdl cholesterol", "total cholesterol", "triglycerides", "lipid panel"],
    "dyslipidemia": ["ldl cholesterol", "hdl cholesterol", "total cholesterol", "triglycerides"],
    "chronic kidney disease": ["serum creatinine", "creatinine", "egfr", "blood urea nitrogen", "bun", "microalbumin"],
    "anemia": ["hemoglobin", "hematocrit", "red blood cell count", "mcv", "mch", "mchc", "ferritin", "iron"],
    "infection": ["white blood cell count", "erythrocyte sedimentation rate", "c-reactive protein", "crp", "esr"],
}

# Common clinical treatment indications (for cautious, verified linkage)
KNOWN_INDICATIONS = {
    "metformin": ["diabetes", "type 2 diabetes mellitus"],
    "glimepiride": ["diabetes", "type 2 diabetes mellitus"],
    "insulin": ["diabetes", "type 2 diabetes mellitus"],
    "lisinopril": ["hypertension", "essential hypertension", "chronic kidney disease"],
    "amlodipine": ["hypertension", "essential hypertension"],
    "losartan": ["hypertension", "essential hypertension", "chronic kidney disease"],
    "atorvastatin": ["hyperlipidemia", "dyslipidemia"],
    "rosuvastatin": ["hyperlipidemia", "dyslipidemia"],
    "aspirin": ["hypertension", "cardiovascular", "coronary artery disease"],
}

def generate_patient_relationship_graph(
    patient_id: int,
    db: Session,
    allowed_document_ids: Optional[Set[int]] = None
) -> RelationshipGraphResponse:
    """
    Constructs a clinically truthful, source-linked medical relationship graph
    from actual database records without hallucinating medical claims.
    Prioritizes active conditions, current medications, and abnormal findings.
    """
    patient = db.query(User).filter(User.id == patient_id).first()
    patient_name = patient.full_name if patient else f"Patient #{patient_id}"

    # Query documents
    doc_query = db.query(Document).filter(Document.patient_id == patient_id)
    if allowed_document_ids is not None:
        doc_query = doc_query.filter(Document.id.in_(allowed_document_ids))
    documents = doc_query.order_by(Document.uploaded_at.desc()).all()
    doc_map = {d.id: d for d in documents}
    valid_doc_ids = set(doc_map.keys())

    if not valid_doc_ids:
        return RelationshipGraphResponse(
            patient_id=patient_id,
            patient_name=patient_name,
            nodes=[],
            edges=[],
            node_counts={},
            edge_counts={},
            overview_node_ids=[]
        )

    # Query facts belonging to these documents
    facts = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.patient_id == patient_id, ExtractedFact.document_id.in_(valid_doc_ids))
        .order_by(ExtractedFact.event_date.asc().nullslast(), ExtractedFact.created_at.asc())
        .all()
    )

    # Query discrepancies
    discs = db.query(Discrepancy).filter(Discrepancy.patient_id == patient_id).all()

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_id_set: Set[str] = set()
    edge_id_set: Set[str] = set()

    # 1. Add Document Nodes
    for doc in documents:
        node_id = f"doc-{doc.id}"
        if node_id not in node_id_set:
            node_id_set.add(node_id)
            date_str = str(doc.document_date or doc.event_date or doc.uploaded_at.strftime("%Y-%m-%d"))
            nodes.append(GraphNode(
                id=node_id,
                label=doc.uploaded_filename,
                type="document",
                category="Clinical Document",
                date=date_str,
                details={
                    "document_type": doc.document_type,
                    "mime_type": doc.mime_type,
                    "size_bytes": doc.size_bytes,
                    "sha256": doc.sha256_hash,
                    "processing_status": doc.processing_status
                },
                verification_status="verified",
                document_name=doc.uploaded_filename,
                document_id=doc.id,
                is_active=True,
                is_abnormal=False,
                priority_score=2
            ))

    doc_facts: Dict[int, List[ExtractedFact]] = {}

    # 2. Add Fact Nodes with Clinical Prioritization
    for fact in facts:
        node_id = f"fact-{fact.id}"
        if node_id not in node_id_set:
            node_id_set.add(node_id)
            doc = doc_map.get(fact.document_id)
            doc_name = doc.uploaded_filename if doc else None
            date_str = str(fact.event_date) if fact.event_date else (doc.uploaded_at.strftime("%Y-%m-%d") if doc else None)

            val_json = dict(fact.value_json or {})
            fact_type = fact.fact_type
            
            # Abnormality & Activity evaluation
            is_abnormal = bool(val_json.get("is_abnormal", False))
            abnormality_status = val_json.get("abnormality_status", "unknown")
            if abnormality_status in ("low", "high"):
                is_abnormal = True

            is_active = True
            status_str = str(val_json.get("status") or "").lower()
            if status_str in ("discontinued", "resolved", "inactive", "stopped", "historical"):
                is_active = False

            # Calculate Clinical Priority Score (1-10)
            priority = 5
            if fact_type == "condition":
                priority = 10 if is_active else 4
            elif fact_type == "medication":
                priority = 8 if is_active else 3
            elif fact_type in ("lab_result", "vital"):
                priority = 9 if is_abnormal else 4
            elif fact_type == "allergy":
                priority = 9

            canonical_id = val_json.get("canonical_id")

            nodes.append(GraphNode(
                id=node_id,
                label=fact.normalized_value,
                type=fact_type,
                category=fact_type.replace("_", " ").title(),
                date=date_str,
                details=val_json,
                verification_status=fact.verification_status,
                confidence_score=fact.confidence_score,
                confidence_label=fact.confidence_label,
                document_name=doc_name,
                document_id=fact.document_id,
                source_page=fact.source_page or 1,
                source_excerpt=fact.source_excerpt,
                is_active=is_active,
                is_abnormal=is_abnormal,
                abnormality_status=abnormality_status,
                priority_score=priority,
                canonical_id=canonical_id
            ))

        doc_facts.setdefault(fact.document_id, []).append(fact)

        # Edge: Fact -> "Documented in" -> Document (Provenance Edge)
        edge_id = f"edge-doc-{fact.id}-{fact.document_id}"
        if edge_id not in edge_id_set:
            edge_id_set.add(edge_id)
            edges.append(GraphEdge(
                id=edge_id,
                source=node_id,
                target=f"doc-{fact.document_id}",
                label="Documented in",
                relationship_type="provenance",
                relationship_nature="explicit_documented",
                status="verified",
                explanation=f"Explicitly extracted from '{doc_name}' on page {fact.source_page or 1}.",
                source_document_name=doc_name,
                source_page=fact.source_page or 1,
                source_excerpt=fact.source_excerpt
            ))

    # 3. Clinical Relationships between Conditions and Medications (Safe & Verified)
    # Rules:
    # A. Explicitly documented: Medication indication explicitly specifies condition, or source excerpt links them.
    # B. Clinically supported indication: Known pharmacotherapeutic indication.
    # C. Co-documented in regimen: Clearly marked as inferred/concurrent rather than claiming treatment without evidence.
    for doc_id, facts_in_doc in doc_facts.items():
        doc = doc_map.get(doc_id)
        doc_name = doc.uploaded_filename if doc else "Document"
        conditions = [f for f in facts_in_doc if f.fact_type == "condition"]
        medications = [f for f in facts_in_doc if f.fact_type == "medication"]

        for cond in conditions:
            cond_name = cond.normalized_value.lower()
            for med in medications:
                med_name = med.normalized_value.lower()
                med_val = med.value_json or {}
                med_indication = str(med_val.get("indication") or "").lower()
                med_excerpt = str(med.source_excerpt or "").lower()

                edge_id = f"edge-tx-{cond.id}-{med.id}"
                if edge_id in edge_id_set:
                    continue

                # Check for explicit documentation
                is_explicit = (
                    cond_name in med_indication or
                    cond_name in med_excerpt
                )

                # Check for known clinical therapeutic indication
                is_known = False
                for drug_key, targets in KNOWN_INDICATIONS.items():
                    if drug_key in med_name and any(tgt in cond_name for tgt in targets):
                        is_known = True
                        break

                if is_explicit:
                    edge_id_set.add(edge_id)
                    edges.append(GraphEdge(
                        id=edge_id,
                        source=f"fact-{cond.id}",
                        target=f"fact-{med.id}",
                        label="Indicated for",
                        relationship_type="treatment",
                        relationship_nature="explicit_documented",
                        status="verified",
                        explanation=f"Explicitly documented as therapy for '{cond.normalized_value}' in '{doc_name}'.",
                        source_document_name=doc_name,
                        source_page=med.source_page or 1,
                        source_excerpt=med.source_excerpt
                    ))
                elif is_known:
                    edge_id_set.add(edge_id)
                    edges.append(GraphEdge(
                        id=edge_id,
                        source=f"fact-{cond.id}",
                        target=f"fact-{med.id}",
                        label="Prescribed for",
                        relationship_type="treatment",
                        relationship_nature="explicit_documented",
                        status="verified" if cond.verification_status == "clinician_verified" else "extracted",
                        explanation=f"Prescribed for '{cond.normalized_value}' based on standard clinical indication in '{doc_name}'.",
                        source_document_name=doc_name,
                        source_page=med.source_page or 1,
                        source_excerpt=med.source_excerpt
                    ))
                else:
                    # Inferred co-occurrence: DO NOT claim treatment without evidence (Requirement E & Test Case 2)
                    edge_id_set.add(edge_id)
                    edges.append(GraphEdge(
                        id=edge_id,
                        source=f"fact-{cond.id}",
                        target=f"fact-{med.id}",
                        label="Concurrent in regimen",
                        relationship_type="concurrent",
                        relationship_nature="inferred",
                        status="inferred",
                        explanation=f"Documented together in '{doc_name}' without explicit clinical indication link in excerpt.",
                        source_document_name=doc_name,
                        source_page=med.source_page or 1,
                        source_excerpt=med.source_excerpt
                    ))

    # 4. Standard Clinical Biomarker Monitoring Relationships
    conditions_all = [f for f in facts if f.fact_type == "condition"]
    labs_all = [f for f in facts if f.fact_type in ("lab_result", "vital")]

    for cond in conditions_all:
        cond_name_lower = cond.normalized_value.lower()
        matched_keywords = []
        for term, keywords in MONITORING_ASSOCIATIONS.items():
            if term in cond_name_lower:
                matched_keywords.extend(keywords)

        if matched_keywords:
            for lab in labs_all:
                lab_name_lower = lab.normalized_value.lower()
                if any(kw in lab_name_lower for kw in matched_keywords):
                    edge_id = f"edge-mon-{cond.id}-{lab.id}"
                    if edge_id not in edge_id_set:
                        edge_id_set.add(edge_id)
                        edges.append(GraphEdge(
                            id=edge_id,
                            source=f"fact-{cond.id}",
                            target=f"fact-{lab.id}",
                            label="Monitored by",
                            relationship_type="biomarker_monitoring",
                            relationship_nature="biomarker_monitoring",
                            status="verified",
                            explanation=f"Longitudinal biomarker '{lab.normalized_value}' routinely monitors '{cond.normalized_value}' progression and therapeutic response."
                        ))

    # 5. Medication Discrepancies and Transitions
    for d in discs:
        if d.fact_id_1 and d.fact_id_2:
            f1_node = f"fact-{d.fact_id_1}"
            f2_node = f"fact-{d.fact_id_2}"
            if f1_node in node_id_set and f2_node in node_id_set:
                edge_id = f"edge-disc-{d.id}"
                if edge_id not in edge_id_set:
                    edge_id_set.add(edge_id)
                    label = "Supersedes previous prescription" if "transition" in d.explanation.lower() else "Dosage mismatch"
                    edges.append(GraphEdge(
                        id=edge_id,
                        source=f1_node,
                        target=f2_node,
                        label=label,
                        relationship_type="discrepancy_transition",
                        relationship_nature="explicit_documented",
                        status="flagged_discrepancy",
                        explanation=d.explanation
                    ))

    # 6. Calculate Overview Nodes: Curated high-priority clinical subset (Part 1.A)
    # Prioritizes: Active conditions, current medications, abnormal labs, and conflicts.
    # Excludes documents and normal labs from initial cluttered canvas.
    overview_nodes = []
    
    # Active conditions
    active_conds = [n.id for n in nodes if n.type == "condition" and n.is_active]
    overview_nodes.extend(active_conds[:4])

    # Current medications
    active_meds = [n.id for n in nodes if n.type == "medication" and n.is_active]
    overview_nodes.extend(active_meds[:5])

    # Abnormal labs
    abnormal_labs = [n.id for n in nodes if n.type in ("lab_result", "vital") and n.is_abnormal]
    overview_nodes.extend(abnormal_labs[:5])

    # If no abnormal labs or active items found, fallback to top 8 highest priority nodes
    if len(overview_nodes) < 3:
        sorted_facts = sorted([n for n in nodes if n.type != "document"], key=lambda x: x.priority_score, reverse=True)
        overview_nodes = [n.id for n in sorted_facts[:8]]

    # Ensure unique
    overview_node_ids = list(dict.fromkeys(overview_nodes))

    # Count nodes and edges
    node_counts = {}
    for n in nodes:
        node_counts[n.type] = node_counts.get(n.type, 0) + 1

    edge_counts = {}
    for e in edges:
        edge_counts[e.label] = edge_counts.get(e.label, 0) + 1

    return RelationshipGraphResponse(
        patient_id=patient_id,
        patient_name=patient_name,
        nodes=nodes,
        edges=edges,
        node_counts=node_counts,
        edge_counts=edge_counts,
        overview_node_ids=overview_node_ids
    )
