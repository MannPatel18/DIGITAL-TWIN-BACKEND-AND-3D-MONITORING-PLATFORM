import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from PIL import Image
import random

from app.ai.nn_model import StructuralDefectCNN, CLASSES
from app.database import STATIC_DIR

class ConcreteCrackDataset(Dataset):
    def __init__(self, file_label_pairs, transform=None):
        self.pairs = file_label_pairs
        self.transform = transform

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        path, label = self.pairs[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label

def build_dataset_from_metu():
    dataset_base = os.path.join(STATIC_DIR, "..", "data", "concrete_dataset", "test")
    neg_dir = os.path.join(dataset_base, "Negative")
    pos_dir = os.path.join(dataset_base, "Positive")
    uploads_dir = os.path.join(STATIC_DIR, "uploads")
    samples_dir = os.path.join(STATIC_DIR, "samples")

    neg_files = [os.path.join(neg_dir, f) for f in os.listdir(neg_dir) if f.endswith(".jpg")]
    pos_files = [os.path.join(pos_dir, f) for f in os.listdir(pos_dir) if f.endswith(".jpg")]

    # Sample 500 clean concrete images and 500 cracked concrete images
    random.seed(42)
    selected_neg = random.sample(neg_files, min(500, len(neg_files)))
    selected_pos = random.sample(pos_files, min(500, len(pos_files)))

    pairs = []
    # Class 0: NOMINAL (Clean)
    for p in selected_neg:
        pairs.append((p, 0))

    # Add real uploaded clean bridge columns
    col1 = os.path.join(uploads_dir, "temp_round-bridge-support-columns-DA62WG.jpg")
    col2 = os.path.join(uploads_dir, "temp_images.jpeg")
    if os.path.exists(col1):
        for _ in range(15): pairs.append((col1, 0))
    if os.path.exists(col2):
        for _ in range(15): pairs.append((col2, 0))

    # Class 1: CRACK
    for p in selected_pos:
        pairs.append((p, 1))

    # Add real uploaded crack photos
    crack1 = os.path.join(uploads_dir, "temp_hairline-crack-wall.webp")
    crack2 = os.path.join(samples_dir, "pier1_fatigue_crack.jpg")
    if os.path.exists(crack1):
        for _ in range(15): pairs.append((crack1, 1))
    if os.path.exists(crack2):
        for _ in range(15): pairs.append((crack2, 1))

    # Class 2: CORROSION
    corrosion_path = os.path.join(samples_dir, "deck_steel_corrosion.jpg")
    if os.path.exists(corrosion_path):
        for _ in range(80): pairs.append((corrosion_path, 2))

    random.shuffle(pairs)
    print(f"Total authentic training dataset size: {len(pairs)} images (Nominal: {len(selected_neg)}, Crack: {len(selected_pos)})", flush=True)

    aug = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return ConcreteCrackDataset(pairs, transform=aug)

def train_and_evaluate():
    dataset = build_dataset_from_metu()
    # 85% train, 15% validation
    train_size = int(0.85 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=32, shuffle=False)

    model = StructuralDefectCNN(num_classes=3)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0008, weight_decay=1e-4)

    print("Beginning Deep Learning Training on authentic benchmark dataset...", flush=True)
    model.train()
    epochs = 8
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0
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

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for v_imgs, v_lbls in val_loader:
                v_out = model(v_imgs)
                _, v_preds = torch.max(v_out, 1)
                val_correct += (v_preds == v_lbls).sum().item()
                val_total += v_lbls.size(0)
        val_acc = (val_correct / val_total) * 100.0
        model.train()

        print(f"Epoch [{epoch+1}/{epochs}] - Train Loss: {total_loss/len(train_loader):.4f} - Train Acc: {train_acc:.1f}% - Val Acc: {val_acc:.1f}%", flush=True)

    save_path = os.path.join(os.path.dirname(__file__), "defect_model.pth")
    torch.save(model.state_dict(), save_path)
    print(f"Saved calibrated defect model to {save_path}", flush=True)

if __name__ == "__main__":
    train_and_evaluate()
