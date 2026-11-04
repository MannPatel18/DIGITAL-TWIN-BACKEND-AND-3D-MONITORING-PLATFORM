import os
import sys
import torch
import torch.nn.functional as F
from PIL import Image

sys.path.insert(0, r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend")
from app.ai.resnet_model import ResNetDefectClassifier, CLASSES, transform_resnet
from app.database import STATIC_DIR

model = ResNetDefectClassifier(num_classes=3, pretrained=False)
weights_path = r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend\app\ai\resnet_defect_model.pth"
model.load_state_dict(torch.load(weights_path, map_location="cpu"))
model.eval()

test_images = [
    ("images (1).jpeg (Cable-Stayed Bridge Deck & Sky)", os.path.join(STATIC_DIR, "uploads", "temp_images (1).jpeg")),
    ("images.jpeg (Good Bridge Pier Underside)", os.path.join(STATIC_DIR, "uploads", "temp_images.jpeg")),
    ("round-bridge-support-columns-DA62WG.jpg (Clean Column)", os.path.join(STATIC_DIR, "uploads", "temp_round-bridge-support-columns-DA62WG.jpg")),
    ("hairline-crack-wall.webp (Concrete Crack)", os.path.join(STATIC_DIR, "uploads", "temp_hairline-crack-wall.webp")),
]

print("=== RESNET-18 INFERENCE VERIFICATION ===")
for label, p in test_images:
    if os.path.exists(p):
        img = Image.open(p).convert("RGB")
        tensor = transform_resnet(img).unsqueeze(0)
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=1)[0]
            pred_idx = torch.argmax(probs).item()
            pred_class = CLASSES[pred_idx]
            conf = probs[pred_idx].item()
        print(f"[{label}]")
        print(f"  -> Predicted: {pred_class} ({conf*100:.2f}%)")
        print(f"  -> Probabilities: {dict(zip(CLASSES, [round(x, 4) for x in probs.tolist()]))}")
    else:
        print(f"[{label}] Not found: {p}")
