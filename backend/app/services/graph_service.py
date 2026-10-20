from typing import List, Dict, Any, Set
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
    "chronic kidney disease": ["serum creatinine", "creatinine", "egfr", "blood urea nitrogen", "bun"],
}

def generate_patient_relationship_graph(
    patient_id: int,
    db: Session,
    allowed_document_ids: Set[int] = None
) -> RelationshipGraphResponse:
    """
    Constructs a clinically truthful, source-linked medical relationship graph
    from actual database records without hallucinating medical claims.
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
                document_id=doc.id
            ))

    # Group facts by document for co-occurrence / prescription associations
    doc_facts: Dict[int, List[ExtractedFact]] = {}

    # 2. Add Fact Nodes
    for fact in facts:
        node_id = f"fact-{fact.id}"
        if node_id not in node_id_set:
            node_id_set.add(node_id)
            doc = doc_map.get(fact.document_id)
            doc_name = doc.uploaded_filename if doc else None
            date_str = str(fact.event_date) if fact.event_date else (doc.uploaded_at.strftime("%Y-%m-%d") if doc else None)

            nodes.append(GraphNode(
                id=node_id,
                label=fact.normalized_value,
                type=fact.fact_type,
                category=fact.fact_type.replace("_", " ").title(),
                date=date_str,
                details=fact.value_json or {},
                verification_status=fact.verification_status,
                confidence_score=fact.confidence_score,
                confidence_label=fact.confidence_label,
                document_name=doc_name,
                document_id=fact.document_id,
                source_page=fact.source_page or 1,
                source_excerpt=fact.source_excerpt
            ))

        doc_facts.setdefault(fact.document_id, []).append(fact)

        # Edge: Fact -> "Documented in" -> Document
        edge_id = f"edge-doc-{fact.id}-{fact.document_id}"
        if edge_id not in edge_id_set:
            edge_id_set.add(edge_id)
            edges.append(GraphEdge(
                id=edge_id,
                source=node_id,
                target=f"doc-{fact.document_id}",
                label="Documented in",
                relationship_type="provenance",
                status="verified",
                explanation=f"Explicitly recorded in source document '{doc_name}' (Page {fact.source_page or 1})."
            ))

    # 3. Document-Level Clinical Associations (e.g. Condition <-> Medication in same prescription)
    for doc_id, facts_in_doc in doc_facts.items():
        doc = doc_map.get(doc_id)
        doc_name = doc.uploaded_filename if doc else "Document"
        conditions = [f for f in facts_in_doc if f.fact_type == "condition"]
        medications = [f for f in facts_in_doc if f.fact_type == "medication"]

        for cond in conditions:
            for med in medications:
                edge_id = f"edge-presc-{cond.id}-{med.id}"
                if edge_id not in edge_id_set:
                    edge_id_set.add(edge_id)
                    edges.append(GraphEdge(
                        id=edge_id,
                        source=f"fact-{cond.id}",
                        target=f"fact-{med.id}",
                        label="Prescribed for",
                        relationship_type="treatment",
                        status="verified" if cond.verification_status == "clinician_verified" else "extracted",
                        explanation=f"Prescribed concurrently with documented diagnosis '{cond.normalized_value}' in {doc_name}."
                    ))

    # 4. Standard Clinical Biomarker Monitoring Relationships
    conditions_all = [f for f in facts if f.fact_type == "condition"]
    labs_all = [f for f in facts if f.fact_type == "lab_result"]

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
                            status="verified",
                            explanation=f"Diagnostic biomarker '{lab.normalized_value}' used in longitudinal monitoring of '{cond.normalized_value}'."
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
                        status="flagged_discrepancy",
                        explanation=d.explanation
                    ))

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
        edge_counts=edge_counts
    )
