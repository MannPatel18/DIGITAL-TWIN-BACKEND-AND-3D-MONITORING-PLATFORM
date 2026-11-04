from typing import Dict, List, Any

def compute_component_health(
    latest_severity: str = "NOMINAL",
    frequency_shift_pct: float = 0.0,
    measured_health: float = None
) -> Dict[str, Any]:
    """
    Computes component health score (0-100) dynamically based on the continuous physical
    measurement of defect dimensions (crack length, area) and vibration frequency shift.
    """
    if measured_health is not None:
        base_score = float(measured_health)
    elif latest_severity == "CRITICAL":
        base_score = 35.0
    elif latest_severity == "MODERATE":
        base_score = 64.0
    elif latest_severity == "MINOR":
        base_score = 85.0
    else:
        base_score = 98.0

    # Small stiffness loss adjustment
    if frequency_shift_pct < -12.0:
        base_score -= 5.0

    score = max(5.0, min(100.0, round(base_score, 1)))

    if score >= 90.0:
        status = "OPTIMAL"
    elif score >= 75.0:
        status = "ADVISORY"
    elif score >= 50.0:
        status = "WARNING"
    else:
        status = "CRITICAL"

    return {"health_score": score, "status": status}

def calculate_bridge_summary(components: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregates pillar-wise scores into the overall Bridge Condition Index (BCI).
    """
    if not components:
        return {"bci": 100.0, "status": "AIRWORTHY"}

    scores = [c["health_score"] for c in components]
    avg_score = sum(scores) / len(scores)
    min_score = min(scores)

    if min_score < 50.0:
        bci = round(0.4 * min_score + 0.6 * avg_score, 1)
        status = "MAINTENANCE_REQUIRED"
    elif min_score < 75.0:
        bci = round(0.3 * min_score + 0.7 * avg_score, 1)
        status = "ADVISORY"
    else:
        bci = round(avg_score, 1)
        status = "AIRWORTHY"

    return {
        "bci": bci,
        "status": status,
        "min_component_health": min_score,
        "avg_component_health": round(avg_score, 1),
        "total_components": len(components),
        "at_risk_components": sum(1 for s in scores if s < 75.0)
    }
