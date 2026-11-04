import numpy as np
from scipy.fft import rfft, rfftfreq
import time
from typing import Dict, List, Any

# Sensor Stations on the Bridge
SENSORS = {
    "SENSOR_P1": {"id": "SENSOR_P1", "name": "Pillar 1 Base Sensor", "component_id": "PILLAR_01", "location": [-18.0, -4.0, 0.0]},
    "SENSOR_DECK": {"id": "SENSOR_DECK", "name": "Mid-Span Deck Accelerometer", "component_id": "DECK_MIDSPAN", "location": [0.0, 3.2, 0.0]},
    "SENSOR_P2": {"id": "SENSOR_P2", "name": "Pillar 2 Base Sensor", "component_id": "PILLAR_02", "location": [18.0, -4.0, 0.0]}
}

class BridgeVibrationSimulator:
    def __init__(self):
        self.sampling_rate = 100.0  # Hz
        self.sample_duration = 2.0  # seconds
        self.num_samples = int(self.sampling_rate * self.sample_duration)
        self.baseline_f0 = 0.85     # Hz (nominal healthy bridge fundamental frequency)
        
        # Component damage levels [0.0 to 1.0]
        self.damage_levels = {
            "PILLAR_01": 0.28,    # Moderate damage -> drops stiffness
            "PILLAR_02": 0.02,    # Healthy
            "DECK_MIDSPAN": 0.12, # Minor deflection/fatigue
            "CABLE_STAY_WEST": 0.02,
            "CABLE_STAY_EAST": 0.02,
            "ABUTMENT_NORTH": 0.03
        }

    def set_damage_level(self, component_id: str, severity: str):
        mapping = {"NOMINAL": 0.01, "MINOR": 0.08, "MODERATE": 0.28, "CRITICAL": 0.65}
        self.damage_levels[component_id] = mapping.get(severity, 0.05)

    def get_live_component_damage(self, component_id: str) -> float:
        """
        Dynamically synchronizes physical vibration simulation with the live component health score
        stored in the SQLite database.
        """
        try:
            from app.database import get_db
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT health_score FROM components WHERE id = ?", (component_id,))
            row = cursor.fetchone()
            conn.close()
            if row and row[0] is not None:
                health = float(row[0])
                # Direct physical degradation: 100 health -> 0.01 damage; 30 health -> 0.70 damage
                damage = max(0.01, min(0.95, (100.0 - health) / 100.0))
                return damage
        except Exception:
            pass
        return self.damage_levels.get(component_id, 0.02)

    def generate_waveform(self, sensor_id: str = "SENSOR_DECK") -> Dict[str, Any]:
        """
        Generates simulated physical acceleration time-series and calculates FFT spectrum.
        """
        info = SENSORS.get(sensor_id, SENSORS["SENSOR_DECK"])
        comp_id = info["component_id"]
        damage = self.get_live_component_damage(comp_id)

        # Stiffness reduction formula: f = f0 * sqrt(1 - damage * 0.4)
        actual_f0 = self.baseline_f0 * np.sqrt(max(0.1, 1.0 - damage * 0.45))
        freq_shift_pct = round(((actual_f0 - self.baseline_f0) / self.baseline_f0) * 100.0, 2)

        t = np.linspace(0, self.sample_duration, self.num_samples, endpoint=False)
        phase = (time.time() * 2.0 * np.pi * actual_f0) % (2.0 * np.pi)

        # Multi-harmonic synthesis with ambient traffic turbulence
        noise = np.random.normal(0, 0.015, self.num_samples)
        
        # Vertical acceleration (Y-axis: dominant bending mode)
        accel_y = (
            (0.08 + damage * 0.05) * np.sin(2.0 * np.pi * actual_f0 * t + phase) +
            0.02 * np.sin(2.0 * np.pi * (actual_f0 * 2.8) * t) +
            noise
        )

        # Longitudinal and transverse accelerations (X and Z)
        accel_x = 0.03 * np.cos(2.0 * np.pi * actual_f0 * t + phase * 0.5) + np.random.normal(0, 0.008, self.num_samples)
        accel_z = 0.04 * np.sin(2.0 * np.pi * (actual_f0 * 1.5) * t) + np.random.normal(0, 0.01, self.num_samples)

        # Compute Fast Fourier Transform (FFT)
        fft_vals = np.abs(rfft(accel_y))
        fft_freqs = rfftfreq(self.num_samples, 1.0 / self.sampling_rate)

        # Keep spectrum up to 5 Hz (civil structural modes of interest)
        mask = fft_freqs <= 5.0
        spectrum_freqs = [round(float(f), 2) for f in fft_freqs[mask]]
        spectrum_amps = [round(float(a), 4) for a in fft_vals[mask]]

        # Subsample time-series for low-latency JSON transmission (last 40 points)
        step = max(1, self.num_samples // 40)
        time_points = [round(float(val), 3) for val in t[::step]]
        accel_points = [round(float(val), 4) for val in accel_y[::step]]

        current_peak_g = float(np.max(np.abs(accel_y)))

        return {
            "sensor_id": sensor_id,
            "sensor_name": info["name"],
            "component_id": comp_id,
            "timestamp": time.time(),
            "baseline_frequency_hz": self.baseline_f0,
            "current_frequency_hz": round(actual_f0, 3),
            "frequency_shift_pct": freq_shift_pct,
            "peak_acceleration_g": round(current_peak_g, 4),
            "temperature_c": round(24.5 + np.sin(time.time() * 0.01) * 2.0, 1),
            "strain_microstrain": round(125.0 + (damage ** 1.1) * 250.0 + np.random.uniform(-2.5, 2.5), 1),
            "time_series": {
                "time": time_points,
                "accel_y": accel_points
            },
            "fft_spectrum": {
                "frequencies": spectrum_freqs,
                "amplitudes": spectrum_amps
            }
        }

vibration_engine = BridgeVibrationSimulator()
