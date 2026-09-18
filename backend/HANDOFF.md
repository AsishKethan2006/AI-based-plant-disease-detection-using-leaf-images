# ML Teammate Handoff: Model Integration Guide

This document outlines how to integrate the trained CNN plant disease classification model into this backend.

---

## 1. How to Run Locally

1. **Navigate to the Backend Directory**:
   ```powershell
   cd backend
   ```
2. **Activate Virtual Environment**:
   - Windows PowerShell:
     ```powershell
     ..\venv\Scripts\Activate.ps1
     ```
3. **Environment Variables**:
   - Ensure a `.env` file exists in `backend/` (copy from `.env.example` if needed):
     ```env
     SECRET_KEY="your-secret-jwt-key"
     DATABASE_URL="sqlite:///./app.db"
     ```
4. **Start the FastAPI Server**:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```
5. **Interactive API Docs**:
   - Open [http://localhost:8000/docs](http://localhost:8000/docs) to register, login, and test `/predict`.

---

## 2. Where the STUB Block Is

The prediction stub is located in [`routes/predict.py`](routes/predict.py) inside the `predict` endpoint:

```python
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
```

---

## 3. What Needs to Replace the STUB

Your inference code should load the saved image from `disk_path`, run preprocessing, invoke your trained model (and Grad-CAM explainer if ready), and produce these 4 variables:

| Variable | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `predicted_class` | `str` | Name of highest-probability class | `"Tomato___Late_blight"` |
| `confidence` | `float` | Probability score between `0.0` and `1.0` | `0.91` |
| `top3_predictions` | `list[dict]` | Top 3 candidate classes with confidence scores | `[{"class": "Tomato___Late_blight", "confidence": 0.91}, ...]` |
| `gradcam_path` | `str` or `None` | Static URL path to generated heatmap image | `"/static/uploads/uuid_gradcam.jpg"` or `None` |

> **Model Weights Location**: Place your exported model weights (e.g. `.keras`, `.h5`, or `.pt`) into `backend/saved_models/` (this directory is already configured in `.gitignore` to prevent committing heavy binary files).

> **Grad-CAM Tip**: If you generate an explainability heatmap image, save it into `static/uploads/` (e.g. `disk_path_gradcam = f"static/uploads/{uuid.uuid4().hex}_gradcam.jpg"`) and assign `gradcam_path = f"/static/uploads/{filename_gradcam}"`.

---

## 4. Exact API Response Contract (`POST /predict`)

Downstream frontend components rely on this exact JSON schema:

```json
{
  "id": 1,
  "predicted_class": "Tomato___Late_blight",
  "confidence": 0.91,
  "top3_predictions": [
    { "class": "Tomato___Late_blight", "confidence": 0.91 },
    { "class": "Tomato___Early_blight", "confidence": 0.06 },
    { "class": "Tomato___healthy", "confidence": 0.03 }
  ],
  "gradcam_path": null,
  "image_path": "/static/uploads/0b8722472ded4b1d92ba4ee759456d08.jpg",
  "disease_name": "Late Blight",
  "disease_description": "Dark spots on leaves that spread fast in cool, wet weather. Treat quickly to save the crop.",
  "created_at": "2026-09-18T14:50:00"
}
```

*Note: `disease_name` and `disease_description` are dynamically translated into the user's preferred language (`en`, `hi`, `kn`, `te`).*

---

## 5. Adding New Classes to Multi-Language Translations

Translations live in [`translations.json`](translations.json) inside `backend/`.

When your trained model outputs new disease classes, add entries keyed by class name:

```json
{
  "New_Class_Name": {
    "en": { "name": "...", "description": "..." },
    "hi": { "name": "...", "description": "..." },
    "kn": { "name": "...", "description": "..." },
    "te": { "name": "...", "description": "..." }
  }
}
```

If a class or language is missing from `translations.json`, the backend gracefully falls back to English or the raw `predicted_class`.
