"""
Clinical Laboratory Test Normalization Module for MediTale.
Provides canonical laboratory test identities, verified synonym mappings,
safety guards (preventing clinically erroneous merges like RBC vs RDW),
unit validation/conversion, and reference-range abnormality assessment.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class CanonicalLabDefinition:
    canonical_id: str
    canonical_name: str
    category: str
    standard_unit: str
    specimen: str
    synonyms: List[str]
    negative_patterns: List[str]  # Must NOT match these (safety guard)
    default_ref_low: Optional[float] = None
    default_ref_high: Optional[float] = None
    description: str = ""

# Centralized Canonical Laboratory Test Catalogue
CANONICAL_LAB_CATALOGUE: Dict[str, CanonicalLabDefinition] = {
    "lab_rbc_count": CanonicalLabDefinition(
        canonical_id="lab_rbc_count",
        canonical_name="Red Blood Cell Count",
        category="Hematology",
        standard_unit="10^6/uL",
        specimen="blood",
        synonyms=[
            r"\brbc\s+count\b",
            r"\bred\s+blood\s+cells?\b",
            r"\bred\s+blood\s+cell\s+count\b",
            r"\berythrocyte\s+count\b",
            r"\btotal\s+rbc\b",
            r"^rbc$",
        ],
        negative_patterns=[r"rdw", r"distribution\s+width", r"morphology"],
        default_ref_low=4.2,
        default_ref_high=5.9,
        description="Total count of circulating erythrocytes per unit volume of blood."
    ),
    "lab_wbc_count": CanonicalLabDefinition(
        canonical_id="lab_wbc_count",
        canonical_name="White Blood Cell Count",
        category="Hematology",
        standard_unit="10^3/uL",
        specimen="blood",
        synonyms=[
            r"\bwbc\s+count\b",
            r"\bwhite\s+blood\s+cells?\b",
            r"\bwhite\s+blood\s+cell\s+count\b",
            r"\bleukocyte\s+count\b",
            r"\btotal\s+wbc\b",
            r"\btotal\s+leukocyte\s+count\b",
            r"\btlc\b",
            r"^wbc$",
        ],
        negative_patterns=[r"%", r"percent", r"diff", r"neu", r"lym", r"mon", r"eos", r"bas"],
        default_ref_low=4.5,
        default_ref_high=11.0,
        description="Total leukocyte concentration in blood; elevated in infection or inflammation."
    ),
    "lab_hemoglobin": CanonicalLabDefinition(
        canonical_id="lab_hemoglobin",
        canonical_name="Hemoglobin",
        category="Hematology",
        standard_unit="g/dL",
        specimen="blood",
        synonyms=[
            r"\bhemoglobin\b",
            r"\bhaemoglobin\b",
            r"\bhgb\b",
            r"\btotal\s+hb\b",
            r"^hb$",
        ],
        negative_patterns=[r"hba1c", r"a1c", r"glycated", r"glycosylated"],
        default_ref_low=12.0,
        default_ref_high=17.5,
        description="Oxygen-carrying metalloprotein in erythrocytes."
    ),
    "lab_hematocrit": CanonicalLabDefinition(
        canonical_id="lab_hematocrit",
        canonical_name="Hematocrit",
        category="Hematology",
        standard_unit="%",
        specimen="blood",
        synonyms=[
            r"\bhematocrit\b",
            r"\bhaematocrit\b",
            r"\bpacked\s+cell\s+volume\b",
            r"\bpcv\b",
            r"^hct$",
        ],
        negative_patterns=[],
        default_ref_low=36.0,
        default_ref_high=52.0,
        description="Volume percentage of red blood cells in whole blood."
    ),
    "lab_platelet_count": CanonicalLabDefinition(
        canonical_id="lab_platelet_count",
        canonical_name="Platelet Count",
        category="Hematology",
        standard_unit="10^3/uL",
        specimen="blood",
        synonyms=[
            r"\bplatelet\s+count\b",
            r"\bplatelets?\b",
            r"\bthrombocytes?\b",
            r"\bthrombocyte\s+count\b",
            r"^plt$",
        ],
        negative_patterns=[r"mpv", r"volume", r"distribution"],
        default_ref_low=150.0,
        default_ref_high=450.0,
        description="Number of platelets per microliter; essential for hemostasis."
    ),
    "lab_hba1c": CanonicalLabDefinition(
        canonical_id="lab_hba1c",
        canonical_name="HbA1c (Glycated Hemoglobin)",
        category="Endocrinology",
        standard_unit="%",
        specimen="blood",
        synonyms=[
            r"\bhba1c\b",
            r"\bglycated\s+hemoglobin\b",
            r"\bglycosylated\s+hemoglobin\b",
            r"\bglycohemoglobin\b",
            r"\ba1c\b",
        ],
        negative_patterns=[],
        default_ref_low=4.0,
        default_ref_high=5.7,
        description="Long-term index of glycemic control over preceding 2-3 months."
    ),
    "lab_fasting_glucose": CanonicalLabDefinition(
        canonical_id="lab_fasting_glucose",
        canonical_name="Fasting Blood Glucose",
        category="Endocrinology",
        standard_unit="mg/dL",
        specimen="plasma",
        synonyms=[
            r"\bfasting\s+blood\s+glucose\b",
            r"\bfasting\s+blood\s+sugar\b",
            r"\bfasting\s+glucose\b",
            r"\bglucose\s+fasting\b",
            r"\bfbs\b",
            r"\bfbg\b",
        ],
        negative_patterns=[r"post-prandial", r"random", r"pp", r"tolerance"],
        default_ref_low=70.0,
        default_ref_high=99.0,
        description="Glucose measurement after minimum 8-hour overnight fast."
    ),
    "lab_serum_creatinine": CanonicalLabDefinition(
        canonical_id="lab_serum_creatinine",
        canonical_name="Serum Creatinine",
        category="Renal Function",
        standard_unit="mg/dL",
        specimen="serum",
        synonyms=[
            r"\bserum\s+creatinine\b",
            r"\bs\.\s*creatinine\b",
            r"\bs-creatinine\b",
            r"\bblood\s+creatinine\b",
            r"^creatinine$",
        ],
        negative_patterns=[r"urine", r"clearance", r"spot", r"24\s*hr"],
        default_ref_low=0.6,
        default_ref_high=1.3,
        description="Primary breakdown marker of muscle metabolism; indicators of glomerular filtration."
    ),
    "lab_ldl_cholesterol": CanonicalLabDefinition(
        canonical_id="lab_ldl_cholesterol",
        canonical_name="LDL Cholesterol",
        category="Lipid Panel",
        standard_unit="mg/dL",
        specimen="serum",
        synonyms=[
            r"\bldl\s+cholesterol\b",
            r"\bldl-cholesterol\b",
            r"\bldl-c\b",
            r"\blow\s+density\s+lipoprotein\b",
            r"^ldl$",
        ],
        negative_patterns=[r"vldl", r"hdl", r"ox-ldl"],
        default_ref_low=0.0,
        default_ref_high=100.0,
        description="Atherogenic low-density lipoprotein cholesterol fraction."
    ),
    "lab_hdl_cholesterol": CanonicalLabDefinition(
        canonical_id="lab_hdl_cholesterol",
        canonical_name="HDL Cholesterol",
        category="Lipid Panel",
        standard_unit="mg/dL",
        specimen="serum",
        synonyms=[
            r"\bhdl\s+cholesterol\b",
            r"\bhdl-cholesterol\b",
            r"\bhdl-c\b",
            r"\bhigh\s+density\s+lipoprotein\b",
            r"^hdl$",
        ],
        negative_patterns=[r"vldl", r"ldl"],
        default_ref_low=40.0,
        default_ref_high=60.0,
        description="Cardioprotective high-density lipoprotein cholesterol fraction."
    ),
    "lab_total_cholesterol": CanonicalLabDefinition(
        canonical_id="lab_total_cholesterol",
        canonical_name="Total Cholesterol",
        category="Lipid Panel",
        standard_unit="mg/dL",
        specimen="serum",
        synonyms=[
            r"\btotal\s+cholesterol\b",
            r"\bcholesterol\s+total\b",
            r"\bserum\s+cholesterol\b",
            r"^cholesterol$",
        ],
        negative_patterns=[r"ldl", r"hdl", r"vldl"],
        default_ref_low=125.0,
        default_ref_high=200.0,
        description="Composite measurement of circulating cholesterol fractions."
    ),
    "lab_triglycerides": CanonicalLabDefinition(
        canonical_id="lab_triglycerides",
        canonical_name="Triglycerides",
        category="Lipid Panel",
        standard_unit="mg/dL",
        specimen="serum",
        synonyms=[
            r"\btriglycerides?\b",
            r"\bserum\s+triglycerides?\b",
            r"\btg\b",
        ],
        negative_patterns=[],
        default_ref_low=0.0,
        default_ref_high=150.0,
        description="Blood lipids derived from glycerol and fatty acids."
    ),
    "lab_esr": CanonicalLabDefinition(
        canonical_id="lab_esr",
        canonical_name="Erythrocyte Sedimentation Rate",
        category="Inflammatory Markers",
        standard_unit="mm/hr",
        specimen="blood",
        synonyms=[
            r"\berythrocyte\s+sedimentation\s+rate\b",
            r"\bsed\s+rate\b",
            r"^esr$",
        ],
        negative_patterns=[],
        default_ref_low=0.0,
        default_ref_high=20.0,
        description="Nonspecific acute-phase inflammatory response metric."
    ),
    "lab_mcv": CanonicalLabDefinition(
        canonical_id="lab_mcv",
        canonical_name="Mean Corpuscular Volume",
        category="Hematology",
        standard_unit="fL",
        specimen="blood",
        synonyms=[
            r"\bmean\s+corpuscular\s+volume\b",
            r"\bmean\s+cell\s+volume\b",
            r"^mcv$",
        ],
        negative_patterns=[],
        default_ref_low=80.0,
        default_ref_high=100.0,
        description="Average volume of a single erythrocyte (microcytic vs macrocytic classification)."
    ),
    "lab_mch": CanonicalLabDefinition(
        canonical_id="lab_mch",
        canonical_name="Mean Corpuscular Hemoglobin",
        category="Hematology",
        standard_unit="pg",
        specimen="blood",
        synonyms=[
            r"\bmean\s+corpuscular\s+hemoglobin\b",
            r"\bmean\s+cell\s+hemoglobin\b",
            r"^mch$",
        ],
        negative_patterns=[r"mchc", r"concentration"],
        default_ref_low=27.0,
        default_ref_high=33.0,
        description="Average mass of hemoglobin per red blood cell."
    ),
    "lab_mchc": CanonicalLabDefinition(
        canonical_id="lab_mchc",
        canonical_name="Mean Corpuscular Hemoglobin Concentration",
        category="Hematology",
        standard_unit="g/dL",
        specimen="blood",
        synonyms=[
            r"\bmean\s+corpuscular\s+hemoglobin\s+concentration\b",
            r"\bmean\s+cell\s+hemoglobin\s+concentration\b",
            r"^mchc$",
        ],
        negative_patterns=[],
        default_ref_low=32.0,
        default_ref_high=36.0,
        description="Average concentration of hemoglobin in a given volume of packed red cells."
    ),
    "lab_rdw": CanonicalLabDefinition(
        canonical_id="lab_rdw",
        canonical_name="Red Cell Distribution Width",
        category="Hematology",
        standard_unit="%",
        specimen="blood",
        synonyms=[
            r"\bred\s+cell\s+distribution\s+width\b",
            r"\bred\s+blood\s+cell\s+distribution\s+width\b",
            r"\brbc\s+distribution\s+width\b",
            r"\brdw-cv\b",
            r"\brdw\s+cv\b",
            r"\brdw\b",
        ],
        negative_patterns=[r"rdw-sd", r"rdw\s+sd"],
        default_ref_low=11.5,
        default_ref_high=14.5,
        description="Measure of anisocytosis; variation in red blood cell volume."
    ),
    "lab_rdw_sd": CanonicalLabDefinition(
        canonical_id="lab_rdw_sd",
        canonical_name="Red Cell Distribution Width (SD)",
        category="Hematology",
        standard_unit="fL",
        specimen="blood",
        synonyms=[
            r"\brdw-sd\b",
            r"\brdw\s+sd\b",
        ],
        negative_patterns=[],
        default_ref_low=39.0,
        default_ref_high=46.0,
        description="Direct width calculation of red blood cell histogram at 20% height."
    ),
    "lab_blood_pressure": CanonicalLabDefinition(
        canonical_id="lab_blood_pressure",
        canonical_name="Blood Pressure",
        category="Vitals",
        standard_unit="mmHg",
        specimen="clinical",
        synonyms=[
            r"\bblood\s+pressure\b",
            r"\bs/p\s*\(bp\)",
            r"^bp$",
        ],
        negative_patterns=[],
        default_ref_low=90.0,
        default_ref_high=120.0,
        description="Arterial blood pressure measurement."
    ),
}

# Differential leukogram subtypes (must NOT merge with total WBC!)
DIFFERENTIAL_SUBTYPES = {
    "neu%": ("Neutrophils (%)", "%", 40.0, 75.0),
    "lym%": ("Lymphocytes (%)", "%", 20.0, 45.0),
    "mon%": ("Monocytes (%)", "%", 2.0, 10.0),
    "eos%": ("Eosinophils (%)", "%", 1.0, 6.0),
    "bas%": ("Basophils (%)", "%", 0.0, 2.0),
    "lym#": ("Absolute Lymphocyte Count", "10^3/uL", 1.0, 4.0),
    "gra#": ("Absolute Granulocyte Count", "10^3/uL", 2.0, 7.5),
}

@dataclass
class LabNormalizationResult:
    canonical_id: str
    canonical_name: str
    original_name: str
    category: str
    standard_unit: str
    raw_unit: Optional[str]
    value: Optional[float]
    reference_range: str
    ref_low: Optional[float]
    ref_high: Optional[float]
    abnormality_status: str  # "normal" | "low" | "high" | "unknown"
    is_abnormal: bool
    specimen: str
    confidence: float
    is_differential: bool = False

def parse_reference_range(range_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    """
    Parses clinical reference range strings into numeric (low, high) bounds.
    Handles formats: '4.5 - 5.9', '< 5.7', '> 40', '0.7 - 1.3 mg/dL', etc.
    """
    if not range_str or not str(range_str).strip():
        return None, None

    s = str(range_str).lower().replace(",", ".").strip()

    # Match '< X' or '<= X'
    m_less = re.search(r"[<≤]\s*([0-9]+\.?[0-9]*)", s)
    if m_less:
        try:
            return 0.0, float(m_less.group(1))
        except ValueError:
            pass

    # Match '> X' or '>= X'
    m_greater = re.search(r"[>≥]\s*([0-9]+\.?[0-9]*)", s)
    if m_greater:
        try:
            return float(m_greater.group(1)), None
        except ValueError:
            pass

    # Match 'X - Y' or 'X to Y'
    m_range = re.search(r"([0-9]+\.?[0-9]*)\s*(?:-|to|–|—)\s*([0-9]+\.?[0-9]*)", s)
    if m_range:
        try:
            low = float(m_range.group(1))
            high = float(m_range.group(2))
            return low, high
        except ValueError:
            pass

    return None, None

def extract_numeric_value(val: Any) -> Optional[float]:
    """Extracts a numeric float from various representations (string, int, float)."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        s = str(val).replace(",", ".").strip()
        m = re.search(r"[-+]?\d*\.?\d+", s)
        return float(m.group(0)) if m else None
    except Exception:
        return None

def evaluate_abnormality(value: Optional[float], ref_low: Optional[float], ref_high: Optional[float]) -> str:
    """
    Evaluates whether a numeric lab result is below, within, or above reference range.
    Returns: 'low', 'normal', 'high', or 'unknown'.
    """
    if value is None:
        return "unknown"
    if ref_low is not None and value < ref_low:
        return "low"
    if ref_high is not None and value > ref_high:
        return "high"
    if ref_low is not None or ref_high is not None:
        return "normal"
    return "unknown"

def normalize_lab_test(
    raw_name: str,
    value: Optional[float] = None,
    raw_unit: Optional[str] = None,
    raw_reference_range: Optional[str] = None
) -> LabNormalizationResult:
    """
    Deterministically normalizes a raw extracted laboratory test name into its
    canonical medical identity using clinical regex matching and safety guardrails.
    """
    cleaned_name = str(raw_name or "").strip()
    norm_search = re.sub(r"[^\w\s%#]", " ", cleaned_name.lower())
    norm_search = re.sub(r"\s+", " ", norm_search).strip()

    # Check for differential subtype first (safety guard against merging with total counts)
    for diff_key, (diff_name, diff_unit, d_low, d_high) in DIFFERENTIAL_SUBTYPES.items():
        if norm_search == diff_key or norm_search.startswith(diff_key) or norm_search.endswith(diff_key):
            ref_low, ref_high = parse_reference_range(raw_reference_range)
            if ref_low is None and ref_high is None:
                ref_low, ref_high = d_low, d_high
            status = evaluate_abnormality(value, ref_low, ref_high)
            ref_str = raw_reference_range or f"{ref_low} - {ref_high} {diff_unit}"
            return LabNormalizationResult(
                canonical_id=f"lab_{diff_key.replace('%', '_pct').replace('#', '_abs')}",
                canonical_name=diff_name,
                original_name=cleaned_name,
                category="Hematology Differential",
                standard_unit=diff_unit,
                raw_unit=raw_unit,
                value=value,
                reference_range=ref_str,
                ref_low=ref_low,
                ref_high=ref_high,
                abnormality_status=status,
                is_abnormal=(status in ("low", "high")),
                specimen="blood",
                confidence=0.95,
                is_differential=True
            )

    # Match against Canonical Catalogue
    matched_def: Optional[CanonicalLabDefinition] = None

    for can_id, can_def in CANONICAL_LAB_CATALOGUE.items():
        # Check negative patterns first (safety guard: e.g. RBC vs RDW)
        has_negative = False
        for neg in can_def.negative_patterns:
            if re.search(neg, norm_search):
                has_negative = True
                break
        if has_negative:
            continue

        # Check positive synonym patterns
        for syn in can_def.synonyms:
            if re.search(syn, norm_search):
                matched_def = can_def
                break

        if matched_def:
            break

    if matched_def:
        ref_low, ref_high = parse_reference_range(raw_reference_range)
        if ref_low is None and ref_high is None:
            ref_low = matched_def.default_ref_low
            ref_high = matched_def.default_ref_high

        status = evaluate_abnormality(value, ref_low, ref_high)
        ref_str = raw_reference_range or (
            f"{ref_low} - {ref_high} {matched_def.standard_unit}" if ref_low is not None and ref_high is not None else "N/A"
        )
        return LabNormalizationResult(
            canonical_id=matched_def.canonical_id,
            canonical_name=matched_def.canonical_name,
            original_name=cleaned_name,
            category=matched_def.category,
            standard_unit=matched_def.standard_unit,
            raw_unit=raw_unit,
            value=value,
            reference_range=ref_str,
            ref_low=ref_low,
            ref_high=ref_high,
            abnormality_status=status,
            is_abnormal=(status in ("low", "high")),
            specimen=matched_def.specimen,
            confidence=0.98,
            is_differential=False
        )

    # Fallback for unrecognized custom lab tests: preserve original without destructive merge
    safe_slug = re.sub(r"[^a-z0-9]+", "_", norm_search).strip("_")
    ref_low, ref_high = parse_reference_range(raw_reference_range)
    status = evaluate_abnormality(value, ref_low, ref_high)
    return LabNormalizationResult(
        canonical_id=f"lab_custom_{safe_slug[:32]}",
        canonical_name=cleaned_name.title() if cleaned_name.islower() else cleaned_name,
        original_name=cleaned_name,
        category="General Diagnostic",
        standard_unit=raw_unit or "",
        raw_unit=raw_unit,
        value=value,
        reference_range=raw_reference_range or "N/A",
        ref_low=ref_low,
        ref_high=ref_high,
        abnormality_status=status,
        is_abnormal=(status in ("low", "high")),
        specimen="clinical",
        confidence=0.75,
        is_differential=False
    )
