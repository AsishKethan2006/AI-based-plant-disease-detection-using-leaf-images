import io
import os
import json
from PIL import Image
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from database.db import Base, engine, SessionLocal
from database.models import User, Prediction
from routes.auth import RegisterRequest, ALLOWED_LANGUAGES
from routes.predict import get_disease_translation, predict, history, MAX_FILE_SIZE
from auth.security import (
    SECRET_KEY,
    oauth2_scheme,
    hash_password,
    verify_password,
    verify_password_constant_time,
    create_access_token,
    get_current_user,
)
from auth.rate_limiter import RateLimiter, limiter
import auth.dependencies as auth_deps


def create_valid_image(fmt="JPEG") -> bytes:
    """Generates a valid 10x10 test image binary in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (10, 10), color="green")
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_auth_security_fixes():
    print("Testing auth security fixes...")
    assert SECRET_KEY is not None, "SECRET_KEY should not be None"
    assert oauth2_scheme.model.flows.password.tokenUrl == "/auth/login", (
        f"tokenUrl should be '/auth/login', got '{oauth2_scheme.model.flows.password.tokenUrl}'"
    )
    assert auth_deps.get_current_user is get_current_user
    assert auth_deps.oauth2_scheme is oauth2_scheme
    print("[OK] Auth security & dependency fixes passed.")


def test_strict_input_validation():
    print("Testing strict input validation (username, email, password)...")
    assert ALLOWED_LANGUAGES == {"en", "hi", "kn", "te"}

    # 1. Valid Registration
    req = RegisterRequest(
        username="valid_user-99",
        email="farmer.user@krishi.gov.in",
        password="ValidPassword123",
        preferred_language="kn",
    )
    assert req.username == "valid_user-99"
    assert req.email == "farmer.user@krishi.gov.in"

    # 2. Username Validation Tests
    invalid_usernames = ["ab", "a" * 31, "user@domain", "user name", "<script>", "admin;--"]
    for u in invalid_usernames:
        try:
            RegisterRequest(
                username=u,
                email="valid@example.com",
                password="password123",
                preferred_language="en",
            )
            assert False, f"Should have rejected invalid username: '{u}'"
        except ValidationError:
            pass

    # 3. Email Validation Tests
    invalid_emails = ["notanemail", "@missinguser.com", "user@", "user@.com", "user@domain..com"]
    for e in invalid_emails:
        try:
            RegisterRequest(
                username="valid_user",
                email=e,
                password="password123",
                preferred_language="en",
            )
            assert False, f"Should have rejected invalid email: '{e}'"
        except ValidationError:
            pass

    # 4. Password Minimum Length Tests (< 8 characters)
    try:
        RegisterRequest(
            username="valid_user",
            email="valid@example.com",
            password="short",
            preferred_language="en",
        )
        assert False, "Should have rejected password shorter than 8 characters"
    except ValidationError:
        pass

    # 5. Language Validation Tests
    try:
        RegisterRequest(
            username="valid_user",
            email="valid@example.com",
            password="password123",
            preferred_language="fr",
        )
        assert False, "Should have rejected invalid language 'fr'"
    except ValidationError:
        pass

    print("[OK] Strict input validation passed.")


def test_constant_time_timing_attack_mitigation():
    print("Testing constant-time password verification...")
    # 1. Non-existent user (should execute dummy hash without throwing error)
    result_none = verify_password_constant_time(None, "some_password")
    assert result_none is False

    # 2. Existing user with wrong password
    dummy_user = User(
        username="test_timing",
        email="test_timing@example.com",
        hashed_password=hash_password("RealPassword123"),
    )
    result_wrong = verify_password_constant_time(dummy_user, "WrongPassword123")
    assert result_wrong is False

    # 3. Existing user with correct password
    result_correct = verify_password_constant_time(dummy_user, "RealPassword123")
    assert result_correct is True

    print("[OK] Constant-time timing attack mitigation passed.")


def test_rate_limiter_and_lockout():
    print("Testing rate limiter and account lockout...")
    test_limiter = RateLimiter()

    # 1. Simulate 5 failed login attempts
    ip = "192.168.1.100"
    username = "attacker_target"

    for _ in range(5):
        test_limiter.record_login_failure(ip, username)

    # 6th attempt should trigger 429 lockout
    try:
        test_limiter.check_login_allowed(ip, username)
        assert False, "Should have raised HTTPException 429 after 5 failed attempts"
    except HTTPException as exc:
        assert exc.status_code == 429
        assert "Too many failed login attempts" in exc.detail

    # Different user from same IP should still be allowed
    test_limiter.check_login_allowed(ip, "another_user")

    # 2. Prediction rate limit (10 per minute)
    user_id = 9999
    for _ in range(10):
        test_limiter.check_predict_rate_limit(user_id)

    # 11th attempt should trigger 429
    try:
        test_limiter.check_predict_rate_limit(user_id)
        assert False, "Should have raised HTTPException 429 after 10 predictions in a minute"
    except HTTPException as exc:
        assert exc.status_code == 429
        assert "Rate limit exceeded" in exc.detail

    print("[OK] Rate limiting and account lockout passed.")


def test_translations_lookup():
    print("Testing translations lookup...")
    classes = ["Tomato___Late_blight", "Tomato___Early_blight", "Tomato___healthy"]
    languages = ["en", "hi", "kn", "te"]

    for cls in classes:
        for lang in languages:
            trans = get_disease_translation(cls, lang)
            assert "disease_name" in trans and len(trans["disease_name"]) > 0
            assert "disease_description" in trans and len(trans["disease_description"]) > 0

    kn_late_blight = get_disease_translation("Tomato___Late_blight", "kn")
    assert kn_late_blight["disease_name"] == "ತಡವಾದ ಅಂಗಮಾರಿ ರೋಗ"

    hi_healthy = get_disease_translation("Tomato___healthy", "hi")
    assert hi_healthy["disease_name"] == "स्वस्थ"

    fallback_trans = get_disease_translation("Tomato___Late_blight", "de")
    assert fallback_trans["disease_name"] == "Late Blight"

    unknown_trans = get_disease_translation("Corn___Common_rust", "en")
    assert unknown_trans["disease_name"] == "Corn___Common_rust"

    print("[OK] Translations lookup and fallbacks passed.")


def test_predict_and_history_endpoints():
    print("Testing predict and history endpoints with genuine image verification...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        test_users = {}
        for lang in ["en", "hi", "kn", "te"]:
            username = f"user_{lang}"
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    email=f"{username}@krishi.gov.in",
                    hashed_password=hash_password("ValidPassword123"),
                    preferred_language=lang,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            test_users[lang] = user

        # 1. Valid JPEG Image Upload
        kn_user = test_users["kn"]
        valid_jpeg = create_valid_image(fmt="JPEG")
        file_jpeg = UploadFile(
            file=io.BytesIO(valid_jpeg),
            filename="leaf_kn.jpg",
            headers={"content-type": "image/jpeg"},
        )

        response = predict(file=file_jpeg, db=db, current_user=kn_user)
        assert "audio_path" not in response
        assert response["predicted_class"] == "Tomato___Late_blight"
        assert response["disease_name"] == "ತಡವಾದ ಅಂಗಮಾರಿ ರೋಗ"

        # 2. Valid PNG Image Upload
        te_user = test_users["te"]
        valid_png = create_valid_image(fmt="PNG")
        file_png = UploadFile(
            file=io.BytesIO(valid_png),
            filename="leaf_te.png",
            headers={"content-type": "image/png"},
        )
        response_te = predict(file=file_png, db=db, current_user=te_user)
        assert response_te["disease_name"] == "ఆలస్య తెగులు"

        # 3. Disguised / Corrupted Image (Security Check)
        fake_image_bytes = b"<?php echo 'malicious code'; ?>NotAnImageContent"
        fake_file = UploadFile(
            file=io.BytesIO(fake_image_bytes),
            filename="exploit.jpg",
            headers={"content-type": "image/jpeg"},
        )
        try:
            predict(file=fake_file, db=db, current_user=kn_user)
            assert False, "Should have rejected fake/corrupted image"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "Corrupted or invalid image" in exc.detail

        # 4. History Endpoint Verification
        hist = history(db=db, current_user=te_user)
        assert len(hist) >= 1
        assert hist[0]["disease_name"] == "ఆలస్య తెగులు"

        # 5. File Size Limit Verification (> 10MB)
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

        print("[OK] Predict, history, image verification, and file limits passed.")
    finally:
        db.close()


if __name__ == "__main__":
    test_auth_security_fixes()
    test_strict_input_validation()
    test_constant_time_timing_attack_mitigation()
    test_rate_limiter_and_lockout()
    test_translations_lookup()
    test_predict_and_history_endpoints()
    print("\nALL SECURITY AND FUNCTIONAL VERIFICATIONS PASSED SUCCESSFULLY!")
