import os
import json
import asyncio
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.database import init_db, seed_components_if_empty, get_db, STATIC_DIR
from app.data.seed_data import seed_initial_inspections, generate_procedural_textures
from app.ai.detector import detector
from app.telemetry.vibration_sim import vibration_engine
from app.telemetry.health_calculator import compute_component_health, calculate_bridge_summary

app = FastAPI(title="Bridge Structural Digital Twin API", version="1.0.0")

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images and Grad-CAM heatmaps
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def startup_event():
    init_db()
    seed_components_if_empty()
    seed_initial_inspections()

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "system": "Bridge Digital Twin Engine v1.0"}

@app.get("/api/components")
def get_components():
    """Returns pillar-wise components with their current health and defects."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM components")
    rows = cursor.fetchall()
    
    components = []
    for r in rows:
        comp_id = r["id"]
        # Fetch inspection count
        cursor.execute("SELECT COUNT(*) FROM inspections WHERE component_id = ?", (comp_id,))
        defect_count = cursor.fetchone()[0]
        
        components.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "healthScore": r["health_score"],
            "status": r["status"],
            "defectCount": defect_count,
            "coordinates": {"x": r["coord_x"], "y": r["coord_y"], "z": r["coord_z"]},
            "lastInspectionDate": r["last_inspection"]
        })
    conn.close()
    return components

@app.get("/api/summary")
def get_bridge_summary():
    """Aggregates all components into the Bridge Condition Index (BCI)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT health_score FROM components")
    scores = [r["health_score"] for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM inspections")
    total_inspections = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM inspections WHERE severity = 'CRITICAL'")
    critical_defects = cursor.fetchone()[0]
    conn.close()

    components_data = [{"health_score": s} for s in scores]
    summary = calculate_bridge_summary(components_data)

    return {
        "bridgeConditionIndex": summary["bci"],
        "status": summary["status"],
        "totalInspections": total_inspections,
        "criticalDefects": critical_defects,
        "activeSensors": 3,
        "naturalFrequencyBaseline": vibration_engine.baseline_f0,
        "currentNaturalFrequency": round(vibration_engine.baseline_f0 * 0.94, 2)
    }

@app.get("/api/components/{component_id}")
def get_component_detail(component_id: str):
    """Returns component details and its full inspection history."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM components WHERE id = ?", (component_id,))
    comp_row = cursor.fetchone()
    if not comp_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Component not found")

    cursor.execute("SELECT * FROM inspections WHERE component_id = ? ORDER BY timestamp DESC", (component_id,))
    insp_rows = cursor.fetchall()
    conn.close()

    history = []
    for r in insp_rows:
        history.append({
            "id": r["id"],
            "componentId": r["component_id"],
            "timestamp": r["timestamp"],
            "imageUrl": r["image_url"],
            "gradcamUrl": r["gradcam_url"],
            "damageType": r["damage_type"],
            "severity": r["severity"],
            "confidence": r["confidence"],
            "explainabilityScore": r["explainability_score"],
            "crackLengthMm": r["crack_length_mm"],
            "defectAreaCm2": r["defect_area_cm2"],
            "notes": r["notes"],
            "coordinates": {"x": r["coord_x"], "y": r["coord_y"], "z": r["coord_z"]}
        })

    return {
        "id": comp_row["id"],
        "name": comp_row["name"],
        "category": comp_row["category"],
        "healthScore": comp_row["health_score"],
        "status": comp_row["status"],
        "coordinates": {"x": comp_row["coord_x"], "y": comp_row["coord_y"], "z": comp_row["coord_z"]},
        "inspectionHistory": history
    }

@app.get("/api/inspections")
def get_all_inspections():
    """Returns all inspections across the entire bridge."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inspections ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()

    return [{
        "id": r["id"],
        "componentId": r["component_id"],
        "timestamp": r["timestamp"],
        "imageUrl": r["image_url"],
        "gradcamUrl": r["gradcam_url"],
        "damageType": r["damage_type"],
        "severity": r["severity"],
        "confidence": r["confidence"],
        "explainabilityScore": r["explainability_score"],
        "crackLengthMm": r["crack_length_mm"],
        "defectAreaCm2": r["defect_area_cm2"],
        "notes": r["notes"],
        "coordinates": {"x": r["coord_x"], "y": r["coord_y"], "z": r["coord_z"]}
    } for r in rows]

@app.post("/api/inspect/{component_id}")
def inspect_component(
    component_id: str,
    file: Optional[UploadFile] = None,
    sample_type: Optional[str] = Form(None)
):
    """
    Runs AI Defect Detection & Grad-CAM Explainability on an uploaded image or sample,
    maps 2D coordinates to 3D, saves to SQLite, and updates pillar health.
    """
    samples_dir = os.path.join(STATIC_DIR, "samples")
    
    if file and hasattr(file, "filename") and file.filename:
        temp_path = os.path.join(STATIC_DIR, "uploads", f"temp_{file.filename}")
        content = file.file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        target_image_path = temp_path
        forced_type = None
    elif sample_type == "CORROSION":
        target_image_path = os.path.join(samples_dir, "deck_steel_corrosion.jpg")
        forced_type = "CORROSION"
    elif sample_type == "CLEAN":
        target_image_path = os.path.join(samples_dir, "pier2_clean_surface.jpg")
        forced_type = "NONE"
    else:
        target_image_path = os.path.join(samples_dir, "pier1_fatigue_crack.jpg")
        forced_type = "CRACK"

    if not os.path.exists(target_image_path):
        generate_procedural_textures()

    # Run AI inference + Grad-CAM
    result = detector.analyze_image(target_image_path, component_id, forced_type=forced_type)

    # Save to SQLite
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO inspections (id, component_id, timestamp, image_url, gradcam_url, damage_type, severity, confidence, explainability_score, crack_length_mm, defect_area_cm2, notes, coord_x, coord_y, coord_z)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        result["id"], component_id, result["timestamp"], result["image_url"], result["gradcam_url"],
        result["damage_type"], result["severity"], result["confidence"], result["explainability_score"],
        result["crack_length_mm"], result["defect_area_cm2"], result["notes"],
        result["coord_3d"]["x"], result["coord_3d"]["y"], result["coord_3d"]["z"]
    ))

    # Recalculate Component Health based on continuous defect measurement
    vibration_engine.set_damage_level(component_id, result["severity"])
    new_health = compute_component_health(
        latest_severity=result["severity"],
        frequency_shift_pct=-8.0 if result["severity"] != "NOMINAL" else 0.0,
        measured_health=result.get("measured_health")
    )

    cursor.execute("""
    UPDATE components
    SET health_score = ?, status = ?, last_inspection = ?
    WHERE id = ?
    """, (new_health["health_score"], new_health["status"], result["timestamp"], component_id))

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "inspection": result,
        "updatedComponentHealth": new_health
    }

@app.get("/api/telemetry/snapshot")
def get_telemetry_snapshot(sensor_id: str = "SENSOR_DECK"):
    return vibration_engine.generate_waveform(sensor_id=sensor_id)

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """Streams live 3-axis accelerometer and FFT data at 10 packets/second."""
    await websocket.accept()
    sensor_ids = ["SENSOR_P1", "SENSOR_DECK", "SENSOR_P2"]
    idx = 0
    try:
        while True:
            active_sensor = sensor_ids[idx % len(sensor_ids)]
            data = vibration_engine.generate_waveform(sensor_id=active_sensor)
            await websocket.send_json(data)
            idx += 1
            await asyncio.sleep(0.1) # 10 Hz stream
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()
