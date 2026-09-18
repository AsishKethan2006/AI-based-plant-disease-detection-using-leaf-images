import io
import os
import json
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from database.db import Base, engine, SessionLocal
from database.models import User, Prediction
from routes.auth import RegisterRequest, ALLOWED_LANGUAGES
from routes.predict import get_disease_translation, predict, history, MAX_FILE_SIZE
from auth.security import SECRET_KEY, oauth2_scheme, hash_password, verify_password, create_access_token, get_current_user
import auth.dependencies as auth_deps


def test_auth_security_fixes():
    print("Testing auth security fixes...")
    assert SECRET_KEY is not None, "SECRET_KEY should not be None"
    assert oauth2_scheme.model.flows.password.tokenUrl == "/auth/login", (
        f"tokenUrl should be '/auth/login', got '{oauth2_scheme.model.flows.password.tokenUrl}'"
    )
    # Check that auth.dependencies re-exports get_current_user and oauth2_scheme
    assert auth_deps.get_current_user is get_current_user
    assert auth_deps.oauth2_scheme is oauth2_scheme
    print("[OK] Auth security & dependency fixes passed.")


def test_language_validation():
    print("Testing language validation...")
    assert ALLOWED_LANGUAGES == {"en", "hi", "kn", "te"}

    # Valid registrations
    for lang in ["en", "hi", "kn", "te"]:
        req = RegisterRequest(
            username=f"user_{lang}",
            email=f"{lang}@example.com",
            password="securepassword123",
            preferred_language=lang,
        )
        assert req.preferred_language == lang

    # Invalid language should raise ValidationError
    try:
        RegisterRequest(
            username="user_invalid",
            email="invalid@example.com",
            password="securepassword123",
            preferred_language="fr",
        )
        assert False, "Should have raised ValidationError for invalid language 'fr'"
    except ValidationError:
        pass

    try:
        RegisterRequest(
            username="user_invalid2",
            email="invalid2@example.com",
            password="securepassword123",
            preferred_language="kannada",
        )
        assert False, "Should have raised ValidationError for invalid language 'kannada'"
    except ValidationError:
        pass

    print("[OK] Language validation passed.")


def test_translations_lookup():
    print("Testing translations lookup...")
    # Test stub classes in all 4 languages
    classes = ["Tomato___Late_blight", "Tomato___Early_blight", "Tomato___healthy"]
    languages = ["en", "hi", "kn", "te"]

    for cls in classes:
        for lang in languages:
            trans = get_disease_translation(cls, lang)
            assert "disease_name" in trans and len(trans["disease_name"]) > 0
            assert "disease_description" in trans and len(trans["disease_description"]) > 0

    # Test specific Kannada translation for Late Blight
    kn_late_blight = get_disease_translation("Tomato___Late_blight", "kn")
    assert kn_late_blight["disease_name"] == "ತಡವಾದ ಅಂಗಮಾರಿ ರೋಗ"

    # Test specific Hindi translation for Healthy
    hi_healthy = get_disease_translation("Tomato___healthy", "hi")
    assert hi_healthy["disease_name"] == "स्वस्थ"

    # Test fallback to English when unsupported language passed
    fallback_trans = get_disease_translation("Tomato___Late_blight", "de")
    assert fallback_trans["disease_name"] == "Late Blight"

    # Test fallback for unknown class
    unknown_trans = get_disease_translation("Corn___Common_rust", "en")
    assert unknown_trans["disease_name"] == "Corn___Common_rust"
    assert unknown_trans["disease_description"] == ""

    print("[OK] Translations lookup and fallbacks passed.")


def test_predict_and_history_endpoints():
    print("Testing predict and history endpoints...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create test users with different preferred languages
        test_users = {}
        for lang in ["en", "hi", "kn", "te"]:
            username = f"testuser_{lang}"
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    email=f"{username}@test.com",
                    hashed_password=hash_password("password123"),
                    preferred_language=lang,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            test_users[lang] = user

        # 1. Test normal image upload for Kannada user
        kn_user = test_users["kn"]
        dummy_img_content = b"\xFF\xD8\xFF\xE0" + b"A" * 1024  # Minimal fake JPEG header
        file = UploadFile(
            file=io.BytesIO(dummy_img_content),
            filename="leaf.jpg",
            headers={"content-type": "image/jpeg"},
        )

        response = predict(file=file, db=db, current_user=kn_user)

        # Check response structure
        assert "audio_path" not in response, "'audio_path' should be removed from response"
        assert response["predicted_class"] == "Tomato___Late_blight"
        assert response["confidence"] == 0.91
        assert response["disease_name"] == "ತಡವಾದ ಅಂಗಮಾರಿ ರೋಗ"
        assert "ತಂಪಾದ ಮತ್ತು ತೇವಾಂಶವುಳ್ಳ" in response["disease_description"]
        assert response["gradcam_path"] is None
        assert response["image_path"].startswith("/static/uploads/")
        assert len(response["top3_predictions"]) == 3

        # 2. Test Telugu user
        te_user = test_users["te"]
        file_te = UploadFile(
            file=io.BytesIO(dummy_img_content),
            filename="leaf_te.png",
            headers={"content-type": "image/png"},
        )
        response_te = predict(file=file_te, db=db, current_user=te_user)
        assert response_te["disease_name"] == "ఆలస్య తెగులు"

        # 3. Test GET /predict/history for Telugu user
        hist = history(db=db, current_user=te_user)
        assert len(hist) >= 1
        latest = hist[0]
        assert "audio_path" not in latest
        assert latest["disease_name"] == "ఆలస్య తెగులు"

        # 4. Test file size limit enforcement (> 10MB)
        oversized_data = b"\xFF\xD8\xFF\xE0" + b"X" * (MAX_FILE_SIZE + 100)
        oversized_file = UploadFile(
            file=io.BytesIO(oversized_data),
            filename="huge.jpg",
            headers={"content-type": "image/jpeg"},
        )
        try:
            predict(file=oversized_file, db=db, current_user=kn_user)
            assert False, "Oversized file should raise HTTPException 400"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "exceeds 10MB limit" in exc.detail

        print("[OK] Predict, history, translations, and file size limits passed.")
    finally:
        db.close()


if __name__ == "__main__":
    test_auth_security_fixes()
    test_language_validation()
    test_translations_lookup()
    test_predict_and_history_endpoints()
    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
