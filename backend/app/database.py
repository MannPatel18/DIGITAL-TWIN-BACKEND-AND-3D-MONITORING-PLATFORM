import sqlite3
import os
import json
from typing import Dict, List, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bridge_twin.db")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "heatmaps"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "samples"), exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # 1. Components Table (Pillars, Deck, Cables)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        health_score REAL NOT NULL,
        status TEXT NOT NULL,
        defect_count INTEGER NOT NULL,
        coord_x REAL NOT NULL,
        coord_y REAL NOT NULL,
        coord_z REAL NOT NULL,
        last_inspection TEXT
    )
    """)

    # 2. Inspections Table (Photos, Grad-CAM, Severity, Bounding Box)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        component_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        image_url TEXT NOT NULL,
        gradcam_url TEXT NOT NULL,
        damage_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence REAL NOT NULL,
        explainability_score REAL NOT NULL,
        crack_length_mm REAL,
        defect_area_cm2 REAL,
        notes TEXT,
        coord_x REAL NOT NULL,
        coord_y REAL NOT NULL,
        coord_z REAL NOT NULL,
        FOREIGN KEY (component_id) REFERENCES components(id)
    )
    """)

    # 3. Telemetry Log Table (Historical Vibration Metrics)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        sensor_id TEXT NOT NULL,
        component_id TEXT NOT NULL,
        natural_frequency_hz REAL NOT NULL,
        frequency_shift_pct REAL NOT NULL,
        peak_accel_g REAL NOT NULL,
        status TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def seed_components_if_empty():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM components")
    count = cursor.fetchone()[0]

    if count == 0:
        initial_components = [
            ("PILLAR_01", "Pillar 1 (Pier West - Substructure)", "SUBSTRUCTURE", 64.0, "WARNING", 1, -18.0, -4.0, 0.0, "2026-11-04 10:30"),
            ("PILLAR_02", "Pillar 2 (Pier East - Substructure)", "SUBSTRUCTURE", 94.5, "OPTIMAL", 0, 18.0, -4.0, 0.0, "2026-11-03 14:15"),
            ("DECK_MIDSPAN", "Main Deck Span (Superstructure)", "SUPERSTRUCTURE", 82.0, "ADVISORY", 1, 0.0, 3.2, 0.0, "2026-11-02 09:45"),
            ("CABLE_STAY_WEST", "Stay Cables & Tower West", "SUPERSTRUCTURE", 97.0, "OPTIMAL", 0, -18.0, 12.0, 0.0, "2026-11-01 16:00"),
            ("CABLE_STAY_EAST", "Stay Cables & Tower East", "SUPERSTRUCTURE", 96.0, "OPTIMAL", 0, 18.0, 12.0, 0.0, "2026-11-01 16:00"),
            ("ABUTMENT_NORTH", "North Approach Abutment", "SUBSTRUCTURE", 91.0, "OPTIMAL", 0, -36.0, 1.0, 0.0, "2026-10-28 11:20"),
        ]

        cursor.executemany("""
        INSERT INTO components (id, name, category, health_score, status, defect_count, coord_x, coord_y, coord_z, last_inspection)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_components)
        conn.commit()

    conn.close()
