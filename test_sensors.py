import os, sys
sys.path.insert(0, r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend")
from app.telemetry.vibration_sim import vibration_engine, SENSORS

for s_id in ["SENSOR_P1", "SENSOR_DECK", "SENSOR_P2"]:
    w = vibration_engine.generate_waveform(s_id)
    print(f"{s_id:12} -> Freq: {w['current_frequency_hz']} Hz (Shift: {w['frequency_shift_pct']:+.2f}%) | Strain: {w['strain_microstrain']} ue | Comp: {w['component_id']}")
