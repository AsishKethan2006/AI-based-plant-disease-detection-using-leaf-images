import json
import logging
import os
import uuid
from typing import Dict, List, Optional, Tuple
from PIL import Image
import numpy as np
import torch
from torchvision import models, transforms

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSES_PATH = os.path.join(BASE_DIR, "classes.json")
MODEL_DIR = os.path.join(BASE_DIR, "saved_models")
WEIGHTS_PATH = os.path.join(MODEL_DIR, "best_plant_disease_vit.pth")
UPLOADS_DIR = os.path.join(BASE_DIR, "static", "uploads")

# Cached model singleton
_model = None
_id2label: Dict[int, str] = {}
_label2id: Dict[str, int] = {}
_device = None

# Preprocessing transform matching ViT input configuration
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def load_model():
    """Loads and caches the ViT model, class mappings, and weights into memory."""
    global _model, _id2label, _label2id, _device

    if _model is not None:
        return _model, _id2label, _device

    if not os.path.exists(CLASSES_PATH):
        raise FileNotFoundError(f"Classes mapping file not found at: {CLASSES_PATH}")

    with open(CLASSES_PATH, "r", encoding="utf-8") as f:
        classes_info = json.load(f)

    _id2label = {int(k): v for k, v in classes_info["id2label"].items()}
    _label2id = classes_info["label2id"]
    num_classes = len(classes_info["classes"])

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading Plant Disease ViT (vit_b_16) on device: {_device}")

    # Initialize TorchVision ViT-B/16 architecture
    model = models.vit_b_16(weights=None)
    model.heads.head = torch.nn.Linear(768, num_classes)

    if os.path.exists(WEIGHTS_PATH):
        logger.info(f"Loading fine-tuned model weights from: {WEIGHTS_PATH}")
        state_dict = torch.load(WEIGHTS_PATH, map_location=_device)
        model.load_state_dict(state_dict)
    else:
        logger.warning(
            f"Weights file not found at {WEIGHTS_PATH}. Running with uninitialized weights."
        )

    model.to(_device)
    model.eval()
    _model = model

    return _model, _id2label, _device


def _generate_vit_gradcam(
    model: torch.nn.Module,
    tensor: torch.Tensor,
    target_class_idx: int,
    orig_img: Image.Image,
    alpha: float = 0.45,
) -> Optional[str]:
    """Generates a Grad-CAM explainability heatmap overlay for Vision Transformer."""
    try:
        activations = []
        gradients = []

        def forward_hook(module, inp, out):
            activations.append(out)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        target_layer = model.encoder.layers[-1].ln_1
        h1 = target_layer.register_forward_hook(forward_hook)
        h2 = target_layer.register_full_backward_hook(backward_hook)

        # Enable gradients for the CAM backward pass
        tensor_req = tensor.clone().detach().requires_grad_(True)
        logits = model(tensor_req)
        score = logits[0, target_class_idx]

        model.zero_grad()
        score.backward()

        h1.remove()
        h2.remove()

        if not activations or not gradients:
            return None

        # Spatial patch tokens (exclude the [CLS] token at index 0)
        act = activations[0][0, 1:, :]  # (196, 768)
        grad = gradients[0][0, 1:, :]   # (196, 768)

        weights = grad.mean(dim=0)  # (768,)
        cam = (act * weights).sum(dim=-1)  # (196,)
        cam = torch.clamp(cam, min=0)
        cam_np = cam.reshape(14, 14).detach().cpu().numpy()

        cam_min, cam_max = cam_np.min(), cam_np.max()
        if cam_max > cam_min:
            cam_norm = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_norm = cam_np

        # Resize CAM to original image dimensions
        w, h = orig_img.size
        cam_img = Image.fromarray((cam_norm * 255).astype(np.uint8)).resize(
            (w, h), resample=Image.BILINEAR
        )
        cam_resized = np.array(cam_img, dtype=np.float32) / 255.0

        # JET colormap interpolation: Blue (0) -> Cyan -> Green -> Yellow -> Red (1)
        r = np.clip(1.5 - np.abs(cam_resized * 4 - 3), 0, 1)
        g = np.clip(1.5 - np.abs(cam_resized * 4 - 2), 0, 1)
        b = np.clip(1.5 - np.abs(cam_resized * 4 - 1), 0, 1)
        heatmap = np.stack([r, g, b], axis=-1) * 255.0

        orig_np = np.array(orig_img, dtype=np.float32)
        blended = (1 - alpha) * orig_np + alpha * heatmap
        blended = np.clip(blended, 0, 255).astype(np.uint8)
        result_img = Image.fromarray(blended)

        os.makedirs(UPLOADS_DIR, exist_ok=True)
        filename_gradcam = f"{uuid.uuid4().hex}_gradcam.jpg"
        disk_path_gradcam = os.path.join(UPLOADS_DIR, filename_gradcam)
        result_img.save(disk_path_gradcam, format="JPEG", quality=90)

        return f"/static/uploads/{filename_gradcam}"
    except Exception as e:
        logger.warning(f"Grad-CAM generation skipped due to error: {e}")
        return None


def run_inference(image_path: str, generate_gradcam: bool = True) -> Tuple[str, float, List[Dict[str, float]], Optional[str]]:
    """Performs inference on a leaf image and optionally generates a Grad-CAM heatmap.

    Args:
        image_path: Path to the image file on disk.
        generate_gradcam: Whether to produce an explainability heatmap.

    Returns:
        A tuple of (predicted_class, confidence, top3_predictions, gradcam_path).
    """
    model, id2label, device = load_model()

    orig_img = Image.open(image_path).convert("RGB")
    tensor = transform(orig_img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.nn.functional.softmax(logits, dim=1)[0]
        k = min(3, len(id2label))
        top_probs, top_indices = torch.topk(probs, k)

    top_class_idx = top_indices[0].item()
    predicted_class = id2label[top_class_idx]
    confidence = round(float(top_probs[0].item()), 4)

    top3_predictions = [
        {
            "class": id2label[idx.item()],
            "confidence": round(float(prob.item()), 4),
        }
        for prob, idx in zip(top_probs, top_indices)
    ]

    gradcam_path = None
    if generate_gradcam:
        gradcam_path = _generate_vit_gradcam(model, tensor, top_class_idx, orig_img)

    return predicted_class, confidence, top3_predictions, gradcam_path
