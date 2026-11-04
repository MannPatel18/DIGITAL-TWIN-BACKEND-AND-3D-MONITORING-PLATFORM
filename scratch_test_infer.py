import os
import sys

sys.path.insert(0, r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend")

from app.ai.detector import DefectDetector
from app.database import STATIC_DIR

detector = DefectDetector()

test_images = [
    ("Wall with Diagonal Shear Crack (User Uploaded Photo)", r"C:\Users\patel\.gemini\antigravity\brain\f34ea9d3-8e2d-40be-b03d-ab24243a7fcd\.user_uploaded\media_1793745738394_126aaedb.jpg"),
    ("Cable-Stayed Bridge Deck & Sky (images (1).jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images (1).jpeg")),
    ("Highway Pier Underside (images.jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images.jpeg")),
    ("Round Bridge Support Columns", os.path.join(STATIC_DIR, "uploads", "temp_round-bridge-support-columns-DA62WG.jpg")),
    ("Hairline Wall Crack", os.path.join(STATIC_DIR, "uploads", "temp_hairline-crack-wall.webp")),
]

print("=== VERIFYING TRAINED RESNET-18 ON ALL USER PHOTOS ===")
for name, path in test_images:
    if os.path.exists(path):
        res = detector.analyze_image(path, "PILLAR_01")
        print(f"[{name}]")
        print(f"  Prediction: {res['damage_type']}")
        print(f"  Severity:   {res['severity']}")
        print(f"  Confidence: {res['confidence'] * 100:.2f}%")
        print(f"  Grad-CAM:   {res['explainability_score'] * 100:.1f}% ROI focus")
        print(f"  Heatmap:    {res['gradcam_url']}")
    else:
        print(f"[{name}] File not found at {path}")
