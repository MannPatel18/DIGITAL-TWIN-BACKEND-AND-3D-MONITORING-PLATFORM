import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

from app.ai.nn_model import StructuralDefectCNN, CLASSES
from app.database import STATIC_DIR

class StructuralDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img, label = self.samples[idx]
        if self.transform:
            img = self.transform(img)
        return img, label

def generate_augmented_training_data():
    samples_dir = os.path.join(STATIC_DIR, "samples")
    uploads_dir = os.path.join(STATIC_DIR, "uploads")
    
    nominal_sources = []
    col_path = os.path.join(uploads_dir, "temp_round-bridge-support-columns-DA62WG.jpg")
    clean_path = os.path.join(samples_dir, "pier2_clean_surface.jpg")
    if os.path.exists(col_path): nominal_sources.append(col_path)
    if os.path.exists(clean_path): nominal_sources.append(clean_path)

    crack_sources = []
    hairline_path = os.path.join(uploads_dir, "temp_hairline-crack-wall.webp")
    pier1_path = os.path.join(samples_dir, "pier1_fatigue_crack.jpg")
    if os.path.exists(hairline_path): crack_sources.append(hairline_path)
    if os.path.exists(pier1_path): crack_sources.append(pier1_path)

    corrosion_sources = []
    deck_rust_path = os.path.join(samples_dir, "deck_steel_corrosion.jpg")
    if os.path.exists(deck_rust_path): corrosion_sources.append(deck_rust_path)

    aug = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    dataset_items = []
    
    # Pre-resize base images to 256x256 for instant augmentation speed
    for src in nominal_sources:
        base_img = Image.open(src).convert("RGB").resize((256, 256))
        for _ in range(40):
            dataset_items.append((base_img, 0)) # Class 0: NOMINAL

    for src in crack_sources:
        base_img = Image.open(src).convert("RGB").resize((256, 256))
        for _ in range(40):
            dataset_items.append((base_img, 1)) # Class 1: CRACK

    for src in corrosion_sources:
        base_img = Image.open(src).convert("RGB").resize((256, 256))
        for _ in range(80):
            dataset_items.append((base_img, 2)) # Class 2: CORROSION

    print(f"Dataset generated: {len(dataset_items)} total structural samples.", flush=True)
    return StructuralDataset(dataset_items, transform=aug)

def train_and_save_model(model_save_path: str):
    dataset = generate_augmented_training_data()
    loader = DataLoader(dataset, batch_size=16, shuffle=True)

    model = StructuralDefectCNN(num_classes=3)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print("Beginning PyTorch training epochs...", flush=True)
    model.train()
    epochs = 15
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0
        for images, labels in loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        acc = (correct / total) * 100.0
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {total_loss/len(loader):.4f} - Accuracy: {acc:.1f}%", flush=True)

    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    torch.save(model.state_dict(), model_save_path)
    print(f"Model saved: {model_save_path}", flush=True)
    return model

if __name__ == "__main__":
    save_path = os.path.join(os.path.dirname(__file__), "defect_model.pth")
    train_and_save_model(save_path)
