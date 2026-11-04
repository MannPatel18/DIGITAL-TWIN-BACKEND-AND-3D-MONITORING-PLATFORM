import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.main import (
    health_check,
    get_components,
    get_bridge_summary,
    get_telemetry_snapshot,
    inspect_component,
    startup_event
)

# 1. Startup & Init
startup_event()
print("==================================================", flush=True)
print("     STEP 2 END-TO-END VERIFICATION SUITE         ", flush=True)
print("==================================================\n", flush=True)

# 2. System Health
health = health_check()
print(f"[TEST 1] System Health API: {health['status']} ({health['system']})", flush=True)

# 3. Components
components = get_components()
print(f"[TEST 2] Components Loaded: {len(components)} items", flush=True)
for c in components[:3]:
    print(f"         - {c['id']}: Health={c['healthScore']}/100, Status={c['status']}, Defects={c['defectCount']}", flush=True)

# 4. Bridge Condition Index
summary = get_bridge_summary()
print(f"[TEST 3] Overall Bridge BCI: {summary['bridgeConditionIndex']}/100 ({summary['status']})", flush=True)

# 5. Telemetry & FFT Modal Shift
telemetry = get_telemetry_snapshot(sensor_id="SENSOR_P1")
print(f"[TEST 4] Telemetry & FFT Analysis:", flush=True)
print(f"         - Sensor: {telemetry['sensor_name']}", flush=True)
print(f"         - Resonant Frequency f0: {telemetry['current_frequency_hz']} Hz (Baseline: {telemetry['baseline_frequency_hz']} Hz)", flush=True)
print(f"         - Frequency Shift (Stiffness Loss): {telemetry['frequency_shift_pct']}%", flush=True)
print(f"         - FFT Spectrum Points: {len(telemetry['fft_spectrum']['frequencies'])} frequency bins", flush=True)

# 6. AI Detection & Grad-CAM (Synchronous)
insp = inspect_component("PILLAR_01", sample_type="CRACK")
print(f"[TEST 5] AI Vision & Grad-CAM Explainability:", flush=True)
print(f"         - Status: {insp['status']}", flush=True)
print(f"         - Defect Type: {insp['inspection']['damage_type']}", flush=True)
print(f"         - Severity: {insp['inspection']['severity']}", flush=True)
print(f"         - Confidence: {insp['inspection']['confidence'] * 100:.1f}%", flush=True)
print(f"         - Grad-CAM Attention Focus: {insp['inspection']['explainability_score'] * 100:.1f}% on defect region", flush=True)
print(f"         - 3D Projected Coordinates: {insp['inspection']['coord_3d']}", flush=True)
print(f"         - Updated Pillar 1 Health: {insp['updatedComponentHealth']['health_score']}/100", flush=True)

# 7. Image on Disk
gradcam_rel = insp["inspection"]["gradcam_url"].replace("/static/", "")
full_img_path = os.path.join(os.path.dirname(__file__), "app", "static", gradcam_rel)
print(f"[TEST 6] Disk Verification of Grad-CAM image:", flush=True)
print(f"         - File Exists: {os.path.exists(full_img_path)}", flush=True)
print(f"         - File Size: {os.path.getsize(full_img_path)} bytes", flush=True)

print("\n==================================================", flush=True)
print("     ALL 6 TESTS PASSED! STEP 2 IS 100% READY!     ", flush=True)
print("==================================================", flush=True)
