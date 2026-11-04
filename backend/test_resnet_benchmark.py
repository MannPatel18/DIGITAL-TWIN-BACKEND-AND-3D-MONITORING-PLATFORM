import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import os

# Initialize ResNet-18 with 1 output unit
model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(512, 1)

weights_path = r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend\app\ai\dukenmarga_model.bin"
state_dict = torch.load(weights_path, map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

uploads = r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend\app\static\uploads"
test_files = [
    ("temp_images.jpeg", "User New Upload: Good Bridge Pier"),
    ("temp_round-bridge-support-columns-DA62WG.jpg", "User First Upload: Clean Bridge Columns"),
    ("temp_hairline-crack-wall.webp", "User Upload: Hairline Wall Crack"),
]

print("=================================================================")
print("  TESTING PRETRAINED RESNET-18 (METU CONCRETE CRACK BENCHMARK)   ")
print("=================================================================\n")

with torch.no_grad():
    for fname, desc in test_files:
        fpath = os.path.join(uploads, fname)
        if os.path.exists(fpath):
            img = Image.open(fpath).convert("RGB")
            tensor = transform(img).unsqueeze(0)
            logit = model(tensor).item()
            prob = torch.sigmoid(torch.tensor(logit)).item()
            
            # Note: in binary crack datasets, check if 1 is Crack or Negative
            print(f"File: {fname} ({desc})")
            print(f"  Logit: {logit:.4f} | Sigmoid Prob: {prob*100:.2f}%")
            print("-----------------------------------------------------------------")
