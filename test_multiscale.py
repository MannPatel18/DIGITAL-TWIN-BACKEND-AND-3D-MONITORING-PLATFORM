import os
import sys
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image

sys.path.insert(0, r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend")
from app.ai.resnet_model import ResNetDefectClassifier, CLASSES, transform_resnet
from app.database import STATIC_DIR

model = ResNetDefectClassifier(num_classes=3, pretrained=False)
model.load_state_dict(torch.load(r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend\app\ai\resnet_defect_model.pth", map_location="cpu"))
model.eval()

def multi_scale_detect(img_path):
    img = Image.open(img_path).convert("RGB")
    w, h = img.size

    # Global pass
    t_global = transform_resnet(img).unsqueeze(0)
    with torch.no_grad():
        global_probs = F.softmax(model(t_global), dim=1)[0]

    # Patch passes: 2x2 and 3x3 overlapping grid
    patch_probs_list = [global_probs]
    patch_boxes = [(0, 0, w, h)]

    # 2x2 grid with 25% overlap
    step_x = int(w * 0.5)
    step_y = int(h * 0.5)
    size_x = int(w * 0.6)
    size_y = int(h * 0.6)

    for y in range(0, h - size_y + 1, max(1, step_y)):
        for x in range(0, w - size_x + 1, max(1, step_x)):
            box = (x, y, min(w, x + size_x), min(h, y + size_y))
            patch = img.crop(box)
            t = transform_resnet(patch).unsqueeze(0)
            with torch.no_grad():
                p = F.softmax(model(t), dim=1)[0]
            patch_probs_list.append(p)
            patch_boxes.append(box)

    # Find highest defect probability across all patches
    max_crack_prob = max(p[1].item() for p in patch_probs_list)
    max_corrosion_prob = max(p[2].item() for p in patch_probs_list)
    min_nominal_prob = min(p[0].item() for p in patch_probs_list)

    if max_crack_prob > 0.55:
        predicted = "CRACK"
        conf = max_crack_prob
    elif max_corrosion_prob > 0.65:
        predicted = "CORROSION"
        conf = max_corrosion_prob
    else:
        predicted = "NOMINAL"
        conf = global_probs[0].item()

    return predicted, conf, global_probs.tolist(), max_crack_prob

test_files = [
    ("Wall with Diagonal Crack (User Upload)", r"C:\Users\patel\.gemini\antigravity\brain\f34ea9d3-8e2d-40be-b03d-ab24243a7fcd\.user_uploaded\media_1793745738394_126aaedb.jpg"),
    ("Cable-Stayed Bridge & Sky (images (1).jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images (1).jpeg")),
    ("Highway Pier Underside (images.jpeg)", os.path.join(STATIC_DIR, "uploads", "temp_images.jpeg")),
    ("Round Bridge Column", os.path.join(STATIC_DIR, "uploads", "temp_round-bridge-support-columns-DA62WG.jpg")),
    ("Hairline Wall Crack", os.path.join(STATIC_DIR, "uploads", "temp_hairline-crack-wall.webp")),
]

print("=== MULTI-SCALE PATCH INFERENCE RESULTS ===")
for label, p in test_files:
    if os.path.exists(p):
        pred, conf, g_probs, max_c = multi_scale_detect(p)
        print(f"[{label}]")
        print(f"  Prediction: {pred} (Confidence: {conf*100:.1f}%) | Max Patch Crack: {max_c*100:.1f}%")
    else:
        print(f"[{label}] Not found: {p}")
