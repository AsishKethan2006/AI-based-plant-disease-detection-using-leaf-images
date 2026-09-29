import json
import logging
import os
from typing import Dict, List, Optional, Tuple
from PIL import Image
import torch
from torchvision import models, transforms

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSES_PATH = os.path.join(BASE_DIR, "classes.json")
MODEL_DIR = os.path.join(BASE_DIR, "saved_models")
WEIGHTS_PATH = os.path.join(MODEL_DIR, "best_plant_disease_vit.pth")

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


def run_inference(image_path: str) -> Tuple[str, float, List[Dict[str, float]], Optional[str]]:
    """Performs inference on a leaf image.

    Args:
        image_path: Path to the image file on disk.

    Returns:
        A tuple of (predicted_class, confidence, top3_predictions, gradcam_path):
        - predicted_class (str): Name of the class with highest probability.
        - confidence (float): Highest confidence score between 0.0 and 1.0.
        - top3_predictions (list[dict]): Top 3 predictions formatted as [{'class': str, 'confidence': float}].
        - gradcam_path (str or None): URL path to Grad-CAM / Attention map heatmap or None.
    """
    model, id2label, device = load_model()

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.nn.functional.softmax(logits, dim=1)[0]
        k = min(3, len(id2label))
        top_probs, top_indices = torch.topk(probs, k)

    predicted_class = id2label[top_indices[0].item()]
    confidence = round(float(top_probs[0].item()), 4)

    top3_predictions = [
        {
            "class": id2label[idx.item()],
            "confidence": round(float(prob.item()), 4),
        }
        for prob, idx in zip(top_probs, top_indices)
    ]

    gradcam_path = None

    return predicted_class, confidence, top3_predictions, gradcam_path
