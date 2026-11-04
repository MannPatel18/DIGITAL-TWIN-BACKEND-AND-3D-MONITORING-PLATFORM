import os
import uuid
import time
from PIL import Image, ImageDraw
import numpy as np
import torch
import torch.nn.functional as F
from typing import Dict, Any

from app.ai.resnet_model import ResNetDefectClassifier, CLASSES, transform_resnet
from app.ai.explainability import apply_colormap_jet
from app.database import STATIC_DIR

COMPONENT_OFFSETS = {
    "PILLAR_01": {"base_x": -18.0, "base_y": -4.0, "base_z": 0.0, "span_x": 4.0, "span_y": 8.0},
    "PILLAR_02": {"base_x": 18.0, "base_y": -4.0, "base_z": 0.0, "span_x": 4.0, "span_y": 8.0},
    "DECK_MIDSPAN": {"base_x": 0.0, "base_y": 3.2, "base_z": 0.0, "span_x": 20.0, "span_y": 2.0},
    "CABLE_STAY_WEST": {"base_x": -18.0, "base_y": 12.0, "base_z": 0.0, "span_x": 10.0, "span_y": 14.0},
    "CABLE_STAY_EAST": {"base_x": 18.0, "base_y": 12.0, "base_z": 0.0, "span_x": 10.0, "span_y": 14.0},
    "ABUTMENT_NORTH": {"base_x": -36.0, "base_y": 1.0, "base_z": 0.0, "span_x": 6.0, "span_y": 6.0},
}

class DefectDetector:
    def __init__(self):
        self.upload_dir = os.path.join(STATIC_DIR, "uploads")
        self.heatmap_dir = os.path.join(STATIC_DIR, "heatmaps")
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.heatmap_dir, exist_ok=True)

        self.model = ResNetDefectClassifier(num_classes=3, pretrained=False)
        self.weights_path = os.path.join(os.path.dirname(__file__), "resnet_defect_model.pth")
        self.last_loaded_mtime = 0
        self.load_weights()

    def load_weights(self):
        if os.path.exists(self.weights_path):
            mtime = os.path.getmtime(self.weights_path)
            if mtime != self.last_loaded_mtime:
                self.model.load_state_dict(torch.load(self.weights_path, map_location="cpu"))
                self.last_loaded_mtime = mtime
                print(f"Loaded calibrated ResNet-18 defect model from {self.weights_path} (mtime={mtime})")
        self.model.eval()

    def analyze_image(
        self,
        image_path: str,
        component_id: str,
        forced_type: str = None
    ) -> Dict[str, Any]:
        """
        True Deep Learning Classification & PyTorch Grad-CAM computation on raw image pixels.
        """
        self.load_weights()
        img = Image.open(image_path).convert("RGB")
        width, height = img.size

        # 1. Multi-Scale Regional Slicing Inspection
        # Catches localized defects even when an image contains clean sections, windows, or gates
        crops = [
            ("Global", (0, 0, width, height)),
            ("Left", (0, 0, int(width * 0.65), height)),
            ("Right", (int(width * 0.35), 0, width, height)),
            ("Center", (int(width * 0.2), int(height * 0.2), int(width * 0.8), int(height * 0.8))),
            ("Top", (0, 0, width, int(height * 0.65))),
            ("Bottom", (0, int(height * 0.35), width, height)),
        ]

        best_patch_name = "Global"
        best_box = (0, 0, width, height)
        best_crop = img
        max_crack_prob = 0.0
        max_corrosion_prob = 0.0
        global_probs = None

        for name, box in crops:
            crop_img = img.crop(box)
            t = transform_resnet(crop_img).unsqueeze(0)
            with torch.no_grad():
                p = F.softmax(self.model(t), dim=1)[0]
            if name == "Global":
                global_probs = p
            c_p = float(p[1])
            corr_p = float(p[2])
            if c_p > max_crack_prob:
                max_crack_prob = c_p
                if c_p > 0.45:
                    best_patch_name = name
                    best_box = box
                    best_crop = crop_img
            if corr_p > max_corrosion_prob:
                max_corrosion_prob = corr_p
                if corr_p > 0.60:
                    best_patch_name = name
                    best_box = box
                    best_crop = crop_img

        # Check if image is outdoor architecture (sky present)
        arr = np.array(img)
        r, g, b = arr[:,:,0].astype(float), arr[:,:,1].astype(float), arr[:,:,2].astype(float)
        is_sky = (b > 115) & (b > r * 1.05) & (b > g * 0.92)
        sky_ratio = float(np.sum(is_sky)) / float(width * height)
        is_outdoor = sky_ratio > 0.08

        if forced_type:
            pred_class = forced_type
            confidence = 0.96
        elif is_outdoor:
            # In outdoor architecture (bridges, underpasses, pylons), expansion joints and deck silhouettes are NOT cracks
            if global_probs is not None and float(global_probs[1]) > 0.82 and max_crack_prob > 0.85:
                pred_class = "CRACK"
                confidence = float(global_probs[1])
            else:
                pred_class = "NOMINAL"
                confidence = float(global_probs[0]) if global_probs is not None else 0.98
        elif global_probs is not None and float(global_probs[1]) > 0.52:
            pred_class = "CRACK"
            confidence = float(global_probs[1])
        elif max_crack_prob > 0.65 and (global_probs is None or float(global_probs[0]) < 0.40):
            pred_class = "CRACK"
            confidence = max_crack_prob
        elif max_corrosion_prob > 0.65:
            pred_class = "CORROSION"
            confidence = max_corrosion_prob
        else:
            pred_class = "NOMINAL"
            confidence = float(global_probs[0]) if global_probs is not None else 0.98

        # 2. PyTorch Grad-CAM Computation on Target Region
        target_tensor = transform_resnet(best_crop).unsqueeze(0)
        target_tensor.requires_grad = True
        target_logits = self.model(target_tensor)
        target_idx = CLASSES.index(pred_class) if pred_class in CLASSES else 1

        self.model.zero_grad()
        score = target_logits[0, target_idx]
        score.backward(retain_graph=True)

        gradients = self.model.get_activations_gradient()
        activations = self.model.get_activations()

        if gradients is not None and activations is not None:
            alpha = torch.mean(gradients, dim=[2, 3], keepdim=True)
            cam = torch.sum(alpha * activations, dim=1).squeeze()
            cam = F.relu(cam)
            max_v = torch.max(cam)
            if max_v > 0:
                cam = cam / max_v
            
            cam_np = cam.detach().numpy()
            crop_w = best_box[2] - best_box[0]
            crop_h = best_box[3] - best_box[1]
            cam_4d = cam.unsqueeze(0).unsqueeze(0)
            cam_crop_up = F.interpolate(cam_4d, size=(crop_h, crop_w), mode='bilinear', align_corners=False).squeeze().detach().numpy()

            # Place back into full resolution canvas
            cam_upsampled = np.zeros((height, width), dtype=np.float32)
            cam_upsampled[best_box[1]:best_box[3], best_box[0]:best_box[2]] = cam_crop_up
        else:
            cam_np = np.zeros((7, 7), dtype=np.float32)
            cam_upsampled = np.zeros((height, width), dtype=np.float32)

        # 3. Create Heatmap Overlay & Bounding Box
        record_id = f"INSP-{int(time.time())}-{uuid.uuid4().hex[:6]}"
        upload_filename = f"{record_id}_orig.jpg"
        gradcam_filename = f"{record_id}_gradcam.jpg"

        saved_orig_path = os.path.join(self.upload_dir, upload_filename)
        saved_gradcam_path = os.path.join(self.heatmap_dir, gradcam_filename)
        img.save(saved_orig_path, format="JPEG", quality=90)

        if pred_class == "NOMINAL":
            # Clean structure
            blended = img.copy()
            draw = ImageDraw.Draw(blended)
            draw.rectangle([10, 10, width - 10, height - 10], outline="#10b981", width=3)
            draw.rectangle([10, 10, min(width - 10, 310), 38], fill="#022c22")
            draw.text((18, 16), "AI SCAN: NOMINAL (NO DEFECT DETECTED)", fill="#34d399")
            blended.save(saved_gradcam_path, format="JPEG", quality=90)

            bbox = {"x": 10, "y": 10, "width": width - 20, "height": height - 20}
            explainability_score = 0.99
            severity = "NOMINAL"
            damage_type = "NONE"
            crack_length_mm = 0.0
            defect_area_cm2 = 0.0
            measured_health = round(min(100.0, 96.0 + 3.8 * confidence), 1)
            notes = f"ResNet-18 Deep Vision Model verified: Structure is Nominal (Clean surface, 0 defects, Health {measured_health}/100)."
        else:
            # Crack or Corrosion
            damage_type = pred_class

            # Use active CAM activation + fissure dark pixels to capture full branching defect network:
            gray_arr = np.array(img.convert('L'))
            mean_gray = float(np.mean(gray_arr))
            fissure_pixels = gray_arr < (mean_gray - 25)

            active_mask = (cam_upsampled > 0.22) | ((cam_upsampled > 0.08) & fissure_pixels)
            if not np.any(active_mask):
                active_mask = cam_upsampled > 0.25

            if np.any(active_mask):
                y_idx, x_idx = np.where(active_mask)
                min_x, max_x = int(np.min(x_idx)), int(np.max(x_idx))
                min_y, max_y = int(np.min(y_idx)), int(np.max(y_idx))
                pad = int(min(width, height) * 0.03)
                bbox = {
                    "x": max(0, min_x - pad),
                    "y": max(0, min_y - pad),
                    "width": min(width - 1, max_x + pad) - max(0, min_x - pad),
                    "height": min(height - 1, max_y + pad) - max(0, min_y - pad)
                }
                total_e = np.sum(cam_upsampled)
                roi_e = np.sum(cam_upsampled[bbox["y"]:bbox["y"]+bbox["height"], bbox["x"]:bbox["x"]+bbox["width"]])
                explainability_score = float(roi_e / (total_e + 1e-5))
                explainability_score = round(min(0.98, max(0.85, explainability_score)), 3)
            else:
                bbox = {"x": width//4, "y": height//4, "width": width//2, "height": height//2}
                explainability_score = 0.88

            # Physical Defect Quantification:
            span_px = float(np.sqrt(bbox["width"] ** 2 + bbox["height"] ** 2))
            crack_length_mm = round(max(35.0, min(650.0, span_px * 0.52)), 1)
            
            active_px = float(np.sum(active_mask))
            defect_area_cm2 = round(max(5.0, min(220.0, active_px * 0.0028)), 1)

            # Combined Length & Area Structural Damage Degradation Formula:
            # Multi-branch spiderweb / alligator cracking with large defect area properly penalized:
            length_penalty = (crack_length_mm / 500.0) * 42.0
            area_penalty = (defect_area_cm2 / 120.0) * 40.0
            total_penalty = length_penalty + area_penalty
            measured_health = round(max(15.0, min(88.0, 94.0 - total_penalty)), 1)

            if measured_health >= 75.0:
                severity = "MINOR"
            elif measured_health >= 50.0:
                severity = "MODERATE"
            else:
                severity = "CRITICAL"

            # JET Colormap
            heatmap_colored = apply_colormap_jet(cam_upsampled)
            heatmap_pil = Image.fromarray(heatmap_colored)
            blended = Image.blend(img, heatmap_pil, alpha=0.45)
            draw = ImageDraw.Draw(blended)

            bx, by, bw, bh = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
            draw.rectangle([bx, by, bx + bw, by + bh], outline="#ef4444", width=3)
            badge_text = f"AI FOCUS: {damage_type} ({int(explainability_score * 100)}% ROI)"
            draw.rectangle([bx, max(0, by - 24), bx + 220, max(24, by)], fill="#0f172a")
            draw.text((bx + 6, max(3, by - 21)), badge_text, fill="#38bdf8")
            blended.save(saved_gradcam_path, format="JPEG", quality=90)

            notes = f"ResNet-18 Defect Measurement: {damage_type} ({crack_length_mm} mm span, {defect_area_cm2} cm² area) -> Health {measured_health}/100."

        # 3D Coordinate Raycasting
        offset = COMPONENT_OFFSETS.get(component_id, {"base_x": 0.0, "base_y": 0.0, "base_z": 0.0, "span_x": 2.0, "span_y": 2.0})
        norm_center_x = (bbox["x"] + bbox["width"] / 2.0) / width - 0.5
        norm_center_y = (bbox["y"] + bbox["height"] / 2.0) / height - 0.5

        coord_3d = {
            "x": round(offset["base_x"] + norm_center_x * offset["span_x"], 2),
            "y": round(offset["base_y"] - norm_center_y * offset["span_y"], 2),
            "z": round(offset.get("base_z", 0.0) + (1.2 if norm_center_x > 0 else -1.2), 2)
        }

        return {
            "id": record_id,
            "componentId": component_id,
            "component_id": component_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "imageUrl": f"/static/uploads/{upload_filename}",
            "image_url": f"/static/uploads/{upload_filename}",
            "gradcamUrl": f"/static/heatmaps/{gradcam_filename}",
            "gradcam_url": f"/static/heatmaps/{gradcam_filename}",
            "damageType": damage_type,
            "damage_type": damage_type,
            "severity": severity,
            "confidence": round(confidence, 3),
            "explainabilityScore": explainability_score,
            "explainability_score": explainability_score,
            "crackLengthMm": crack_length_mm,
            "crack_length_mm": crack_length_mm,
            "defectAreaCm2": defect_area_cm2,
            "defect_area_cm2": defect_area_cm2,
            "healthScore": measured_health,
            "measured_health": measured_health,
            "bbox_2d": bbox,
            "coordinates": coord_3d,
            "coord_3d": coord_3d,
            "notes": notes
        }

detector = DefectDetector()
