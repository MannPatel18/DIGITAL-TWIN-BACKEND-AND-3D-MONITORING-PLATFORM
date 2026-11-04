import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from app.database import STATIC_DIR, get_db
from app.ai.detector import detector
from app.telemetry.vibration_sim import vibration_engine

def generate_procedural_textures():
    """Generates realistic synthetic inspection photos for benchmark evaluation."""
    samples_dir = os.path.join(STATIC_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)

    size = (640, 480)

    # 1. Concrete Crack (For Pillar 1)
    base = np.random.normal(165, 18, (size[1], size[0])).clip(0, 255).astype(np.uint8)
    img_crack = Image.fromarray(base).convert("RGB")
    draw = ImageDraw.Draw(img_crack)
    # Draw meandering crack path
    points = []
    x = 180
    for y in range(40, 440, 8):
        x += int(np.random.choice([-4, -2, 0, 1, 3, 5]))
        points.append((x, y))
    
    # Shadow and fissure core
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=(35, 32, 30), width=4)
        # Small branch cracks
        if i % 10 == 0:
            draw.line([points[i], (points[i][0] + 30, points[i][1] + 15)], fill=(45, 40, 38), width=2)
    img_crack = img_crack.filter(ImageFilter.SMOOTH)
    crack_path = os.path.join(samples_dir, "pier1_fatigue_crack.jpg")
    img_crack.save(crack_path, format="JPEG", quality=92)

    # 2. Steel Girder Corrosion / Rust (For Deck Mid-Span)
    rust_arr = np.zeros((size[1], size[0], 3), dtype=np.uint8)
    rust_arr[:, :] = [110, 115, 120] # Steel grey
    # Add rust patch in center
    cy, cx = size[1] // 2, size[0] // 2
    y, x = np.ogrid[:size[1], :size[0]]
    dist_from_center = np.sqrt((x - cx)**2 * 1.2 + (y - cy)**2 * 2.5)
    rust_mask = dist_from_center < 130
    
    # Rust color gradient
    noise = np.random.normal(0, 15, (size[1], size[0]))
    rust_r = np.clip(185 + noise, 0, 255).astype(np.uint8)
    rust_g = np.clip(85 + noise, 0, 255).astype(np.uint8)
    rust_b = np.clip(35 + noise, 0, 255).astype(np.uint8)

    rust_arr[rust_mask, 0] = rust_r[rust_mask]
    rust_arr[rust_mask, 1] = rust_g[rust_mask]
    rust_arr[rust_mask, 2] = rust_b[rust_mask]
    img_rust = Image.fromarray(rust_arr).filter(ImageFilter.GaussianBlur(radius=2))
    rust_path = os.path.join(samples_dir, "deck_steel_corrosion.jpg")
    img_rust.save(rust_path, format="JPEG", quality=92)

    # 3. Clean Concrete (For Pillar 2)
    clean_arr = np.random.normal(185, 10, (size[1], size[0])).clip(0, 255).astype(np.uint8)
    img_clean = Image.fromarray(clean_arr).convert("RGB")
    clean_path = os.path.join(samples_dir, "pier2_clean_surface.jpg")
    img_clean.save(clean_path, format="JPEG", quality=92)

    return crack_path, rust_path, clean_path

def seed_initial_inspections():
    """Seeds the SQLite database with initial AI-verified inspections."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM inspections")
    count = cursor.fetchone()[0]

    if count == 0:
        crack_path, rust_path, clean_path = generate_procedural_textures()

        # Run detection and Grad-CAM on Pillar 1 crack
        res_p1 = detector.analyze_image(crack_path, "PILLAR_01", forced_type="CRACK")
        cursor.execute("""
        INSERT INTO inspections (id, component_id, timestamp, image_url, gradcam_url, damage_type, severity, confidence, explainability_score, crack_length_mm, defect_area_cm2, notes, coord_x, coord_y, coord_z)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res_p1["id"], "PILLAR_01", res_p1["timestamp"], res_p1["image_url"], res_p1["gradcam_url"],
            res_p1["damage_type"], res_p1["severity"], res_p1["confidence"], res_p1["explainability_score"],
            res_p1["crack_length_mm"], res_p1["defect_area_cm2"], res_p1["notes"],
            res_p1["coord_3d"]["x"], res_p1["coord_3d"]["y"], res_p1["coord_3d"]["z"]
        ))

        # Run detection on Deck corrosion
        res_deck = detector.analyze_image(rust_path, "DECK_MIDSPAN", forced_type="CORROSION")
        cursor.execute("""
        INSERT INTO inspections (id, component_id, timestamp, image_url, gradcam_url, damage_type, severity, confidence, explainability_score, crack_length_mm, defect_area_cm2, notes, coord_x, coord_y, coord_z)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res_deck["id"], "DECK_MIDSPAN", res_deck["timestamp"], res_deck["image_url"], res_deck["gradcam_url"],
            res_deck["damage_type"], res_deck["severity"], res_deck["confidence"], res_deck["explainability_score"],
            res_deck["crack_length_mm"], res_deck["defect_area_cm2"], res_deck["notes"],
            res_deck["coord_3d"]["x"], res_deck["coord_3d"]["y"], res_deck["coord_3d"]["z"]
        ))

        conn.commit()

    conn.close()
