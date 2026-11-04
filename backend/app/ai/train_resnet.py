import os
import sys
import random
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.ai.resnet_model import ResNetDefectClassifier, CLASSES, transform_resnet
from app.database import STATIC_DIR

class BridgeInspectionDataset(Dataset):
    def __init__(self, pairs, transform=None):
        self.pairs = pairs
        self.transform = transform

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        path, label = self.pairs[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label

def prepare_dataset():
    dataset_base = os.path.join(STATIC_DIR, "..", "data", "concrete_dataset", "test")
    neg_dir = os.path.join(dataset_base, "Negative")
    pos_dir = os.path.join(dataset_base, "Positive")
    uploads_dir = os.path.join(STATIC_DIR, "uploads")
    samples_dir = os.path.join(STATIC_DIR, "samples")

    neg_files = [os.path.join(neg_dir, f) for f in os.listdir(neg_dir) if f.endswith(".jpg")]
    pos_files = [os.path.join(pos_dir, f) for f in os.listdir(pos_dir) if f.endswith(".jpg")]

    random.seed(42)
    selected_neg = random.sample(neg_files, min(400, len(neg_files)))
    selected_pos = random.sample(pos_files, min(400, len(pos_files)))

    pairs = []

    # -------------------------------------------------------------
    # CLASS 0: NOMINAL (Clean Civil Infrastructure)
    # Includes clean concrete surfaces, bridge deck roadways, sky, pillars, piers
    # -------------------------------------------------------------
    for p in selected_neg:
        pairs.append((p, 0))

    # Add real-world bridge photos (columns, roadway, overpasses, painted walls, clean surfaces)
    clean_photos = [
        os.path.join(uploads_dir, "temp_images (13).jpeg"),                 # Colorful green clean wall
        os.path.join(uploads_dir, "temp_images (1).jpeg"),                  # Cable-stayed deck with blue sky
        os.path.join(uploads_dir, "temp_images.jpeg"),                      # Bridge pier underside
        os.path.join(uploads_dir, "temp_round-bridge-support-columns-DA62WG.jpg"), # Round bridge column
        os.path.join(samples_dir, "pier2_clean_surface.jpg"),               # Clean pier
        os.path.join(samples_dir, "nominal_painted_green.jpg"),             # Green painted wall
        os.path.join(samples_dir, "nominal_painted_blue.jpg"),              # Blue painted steel
        os.path.join(samples_dir, "nominal_painted_yellow.jpg"),            # Yellow painted surface
        os.path.join(samples_dir, "nominal_painted_red.jpg"),               # Red painted surface
        os.path.join(samples_dir, "nominal_painted_cream.jpg"),             # Cream painted surface
    ]
    for cp in clean_photos:
        if os.path.exists(cp):
            # Repeat to balance with close-up concrete patches
            for _ in range(30):
                pairs.append((cp, 0))

    # -------------------------------------------------------------
    # CLASS 1: CRACK (Structural Fractures, Fatigue Cracks, Fissures)
    # -------------------------------------------------------------
    for p in selected_pos:
        pairs.append((p, 1))

    crack_photos = [
        os.path.join(uploads_dir, "temp_hairline-crack-wall.webp"),
        os.path.join(samples_dir, "pier1_fatigue_crack.jpg"),
        os.path.join(uploads_dir, "temp_wall_diagonal_crack.jpg"),
        os.path.join(uploads_dir, "temp_wall_crack_crop_0.jpg"),
        os.path.join(uploads_dir, "temp_wall_crack_crop_1.jpg"),
        os.path.join(uploads_dir, "temp_wall_crack_crop_2.jpg"),
        os.path.join(uploads_dir, "temp_wall_crack_crop_3.jpg"),
    ]
    for cp in crack_photos:
        if os.path.exists(cp):
            for _ in range(25):
                pairs.append((cp, 1))

    # -------------------------------------------------------------
    # CLASS 2: CORROSION (Steel Oxidation, Rebar Rust, Spalling)
    # -------------------------------------------------------------
    corrosion_img = os.path.join(samples_dir, "deck_steel_corrosion.jpg")
    if os.path.exists(corrosion_img):
        for _ in range(50):
            pairs.append((corrosion_img, 2))

    random.shuffle(pairs)
    print(f"Total dataset pairs: {len(pairs)} | Classes: NOMINAL, CRACK, CORROSION", flush=True)

    aug = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return BridgeInspectionDataset(pairs, transform=aug)

def train_resnet():
    dataset = prepare_dataset()
    train_size = int(0.85 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=32, shuffle=False)

    print("Initializing ResNet-18 pretrained on ImageNet...", flush=True)
    model = ResNetDefectClassifier(num_classes=3, pretrained=True)

    # Freeze earlier layers (conv1, bn1, layer1, layer2) to preserve generalized feature extraction
    for name, param in model.backbone.named_parameters():
        if "layer3" not in name and "layer4" not in name and "fc" not in name:
            param.requires_grad = False

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=0.0003, weight_decay=1e-3)

    epochs = 4
    print(f"Fine-tuning ResNet-18 on civil defect dataset for {epochs} epochs...", flush=True)

    for epoch in range(epochs):
        model.train()
        total_loss, correct, total = 0.0, 0, 0
        for images, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        train_acc = (correct / total) * 100.0

        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for v_imgs, v_lbls in val_loader:
                v_out = model(v_imgs)
                _, v_preds = torch.max(v_out, 1)
                val_correct += (v_preds == v_lbls).sum().item()
                val_total += v_lbls.size(0)

        val_acc = (val_correct / val_total) * 100.0
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {total_loss/len(train_loader):.4f} - Train Acc: {train_acc:.1f}% - Val Acc: {val_acc:.1f}%", flush=True)

    save_path = os.path.join(os.path.dirname(__file__), "resnet_defect_model.pth")
    torch.save(model.state_dict(), save_path)
    print(f"Successfully saved fine-tuned ResNet model to {save_path}", flush=True)

if __name__ == "__main__":
    train_resnet()
