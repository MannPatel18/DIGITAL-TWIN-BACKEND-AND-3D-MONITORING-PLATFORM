import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
import numpy as np
from PIL import Image
import os

CLASSES = ["NOMINAL", "CRACK", "CORROSION"]

class ResNetDefectClassifier(nn.Module):
    """
    Industrial-grade Civil Infrastructure Defect Classifier based on Pretrained ResNet-18.
    Retains deep visual representations of real-world scenes (bridges, decks, cables, concrete, sky)
    and uses layer4 activation maps for authentic Grad-CAM explainability.
    """
    def __init__(self, num_classes=3, pretrained=True):
        super().__init__()
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        self.backbone = models.resnet18(weights=weights)
        
        # Replace classification head
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.25),
            nn.Linear(in_features, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )
        
        self.gradients = None
        self.activations = None
        self._register_gradcam_hooks()

    def _register_gradcam_hooks(self):
        # Target ResNet layer4 (final convolutional block before avgpool)
        target_layer = self.backbone.layer4

        def forward_hook(module, input, output):
            self.activations = output

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0]

        target_layer.register_forward_hook(forward_hook)
        target_layer.register_full_backward_hook(backward_hook)

    def forward(self, x):
        return self.backbone(x)

    def get_activations_gradient(self):
        return self.gradients

    def get_activations(self):
        return self.activations

# Standard ResNet preprocessing pipeline
transform_resnet = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])
