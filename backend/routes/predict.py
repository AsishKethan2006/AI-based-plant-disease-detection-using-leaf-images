import json
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User, Prediction
from auth.security import get_current_user

router = APIRouter(prefix="/predict", tags=["predict"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

TRANSLATIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "translations.json")


def get_disease_translation(predicted_class: str, lang: str) -> dict:
    if os.path.exists(TRANSLATIONS_FILE):
        try:
            with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
                translations = json.load(f)
            class_entry = translations.get(predicted_class, {})
            entry = class_entry.get(lang) or class_entry.get("en")
            if entry:
                return {
                    "disease_name": entry.get("name", predicted_class),
                    "disease_description": entry.get("description", ""),
                }
        except Exception:
            pass

    return {
        "disease_name": predicted_class,
        "disease_description": "",
    }


@router.post("")
def predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Uploaded file must be an image")

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Image must be .jpg, .jpeg or .png")

    file_bytes = file.file.read(MAX_FILE_SIZE + 1)
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(400, "File size exceeds 10MB limit")

    filename = f"{uuid.uuid4().hex}{file_ext}"
    disk_path = os.path.join(UPLOAD_DIR, filename)
    with open(disk_path, "wb") as f:
        f.write(file_bytes)

    # URL path (forward slashes) — this is what the frontend loads, not the OS path
    image_path = f"/static/uploads/{filename}"

    # --- STUB: replace this block with real model.predict() once the CNN is ready.
    # The keys and types below are final — only these values are fake.
    predicted_class = "Tomato___Late_blight"
    confidence = 0.91
    top3_predictions = [
        {"class": "Tomato___Late_blight", "confidence": 0.91},
        {"class": "Tomato___Early_blight", "confidence": 0.06},
        {"class": "Tomato___healthy", "confidence": 0.03},
    ]
    gradcam_path = None
    # --- END STUB ---

    prediction = Prediction(
        user_id=current_user.id,
        image_path=image_path,
        predicted_class=predicted_class,
        confidence=confidence,
        top3_predictions=top3_predictions,
        gradcam_path=gradcam_path,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    trans = get_disease_translation(prediction.predicted_class, current_user.preferred_language)

    return {
        "id": prediction.id,
        "predicted_class": prediction.predicted_class,
        "confidence": prediction.confidence,
        "top3_predictions": prediction.top3_predictions,
        "gradcam_path": prediction.gradcam_path,
        "image_path": prediction.image_path,
        "disease_name": trans["disease_name"],
        "disease_description": trans["disease_description"],
        "created_at": prediction.created_at,
    }


@router.get("/history")
def history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )
    result = []
    for r in rows:
        trans = get_disease_translation(r.predicted_class, current_user.preferred_language)
        result.append(
            {
                "id": r.id,
                "predicted_class": r.predicted_class,
                "confidence": r.confidence,
                "top3_predictions": r.top3_predictions,
                "gradcam_path": r.gradcam_path,
                "image_path": r.image_path,
                "disease_name": trans["disease_name"],
                "disease_description": trans["disease_description"],
                "created_at": r.created_at,
            }
        )
    return result
