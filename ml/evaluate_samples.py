"""Standalone evaluation script to benchmark the Vision Transformer model on sample plant disease leaves."""

import os
import sys

# Ensure backend directory is in path to import ml_inference
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import ml_inference  # noqa: E402

TEST_DIR = os.path.join(PROJECT_ROOT, "test_images")


def evaluate():
    if not os.path.exists(TEST_DIR):
        print(f"Test directory not found at: {TEST_DIR}")
        return

    images = [
        f for f in os.listdir(TEST_DIR) if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]
    if not images:
        print(f"No test images found in {TEST_DIR}")
        return

    print("=" * 70)
    print("  PLANT FOLIAR DISEASE DIAGNOSIS: ViT BENCHMARK EVALUATION")
    print("=" * 70)

    total = 0
    correct = 0

    for fname in images:
        path = os.path.join(TEST_DIR, fname)
        expected = os.path.splitext(fname)[0]

        pred_class, conf, top3, gradcam = ml_inference.run_inference(
            path, generate_gradcam=True
        )
        total += 1
        is_match = pred_class == expected
        if is_match:
            correct += 1

        status = "[CORRECT]" if is_match else "[MISMATCH]"
        print(f"\nImage:      {fname}")
        print(f"Expected:   {expected}")
        print(f"Predicted:  {pred_class} {status}")
        print(f"Confidence: {conf * 100:.2f}%")
        print(f"Grad-CAM:   {gradcam or 'N/A'}")
        print("Top 3 Candidates:")
        for idx, item in enumerate(top3, 1):
            print(f"  {idx}. {item['class']:<45} ({item['confidence'] * 100:.2f}%)")

    print("\n" + "=" * 70)
    print(
        f"Evaluation Complete: {correct}/{total} correct ({(correct / total) * 100:.1f}%)"
    )
    print("=" * 70)


if __name__ == "__main__":
    evaluate()
