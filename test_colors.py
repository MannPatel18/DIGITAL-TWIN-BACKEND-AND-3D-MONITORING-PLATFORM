import os, sys
sys.path.insert(0, r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend")
from app.ai.detector import DefectDetector
from app.database import STATIC_DIR

detector = DefectDetector()

test_images = [
    ("Green Clean Wall (images (13).jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images (13).jpeg")),
    ("Severe Spalling (images (6).jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images (6).jpeg")),
    ("Diagonal Wall Shear Crack", os.path.join(STATIC_DIR, "uploads", "temp_wall_diagonal_crack.jpg")),
    ("Clean Bridge Deck & Sky", os.path.join(STATIC_DIR, "uploads", "temp_images (1).jpeg")),
    ("Highway Pier Underside", os.path.join(STATIC_DIR, "uploads", "temp_images.jpeg")),
]

print("=== INFERENCE WITH COLORFUL PAINTED NOMINAL RESNET-18 ===")
for name, p in test_images:
    if os.path.exists(p):
        res = detector.analyze_image(p, "PILLAR_02")
        print(f"{name:35} -> {res['damage_type']:8} | Severity: {res['severity']:8} | Health: {res['healthScore']:5.1f}/100 | Conf: {res['confidence']*100:.1f}%")
