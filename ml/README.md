# Machine Learning Pipeline: Vision Transformer (ViT) Plant Disease Diagnosis

This directory contains the methodology, model architecture, training configuration, and explainable AI (XAI) pipeline for the automated foliar disease classification system.

---

## 1. Model Architecture

The core diagnosis engine leverages a **Vision Transformer (ViT-B/16)** fine-tuned for multi-class plant pathology classification:
- **Base Architecture**: `torchvision.models.vit_b_16`
- **Input Resolution**: $224 \times 224 \times 3$ RGB
- **Patch Size**: $16 \times 16$ (generating a $14 \times 14 = 196$ spatial token grid)
- **Embedding Dimension**: $D = 768$
- **Transformer Encoder**: 12 Multi-Head Self-Attention (MSA) layers, 12 attention heads per layer
- **Classification Head**: `Linear(768, 38)` producing unnormalized logits over 38 botanical pathology classes
- **Inference Latency**: $\approx 120\text{ ms}$ on standard CPU; $< 15\text{ ms}$ on CUDA GPU

---

## 2. Dataset Taxonomy & Coverage

The model is trained and validated on the benchmark **PlantVillage** dataset, covering **38 foliar conditions** across 14 crop cultivars:

| Cultivar | Conditions & Pathologies |
| :--- | :--- |
| **Apple** | Apple Scab, Black Rot, Cedar Apple Rust, Healthy |
| **Blueberry** | Healthy |
| **Cherry** | Powdery Mildew, Healthy |
| **Corn (Maize)** | Cercospora Gray Leaf Spot, Common Rust, Northern Leaf Blight, Healthy |
| **Grape** | Black Rot, Esca (Black Measles), Leaf Blight (Isariopsis), Healthy |
| **Orange** | Huanglongbing (Citrus Greening) |
| **Peach** | Bacterial Spot, Healthy |
| **Pepper (Bell)** | Bacterial Spot, Healthy |
| **Potato** | Early Blight, Late Blight, Healthy |
| **Raspberry** | Healthy |
| **Soybean** | Healthy |
| **Squash** | Powdery Mildew |
| **Strawberry** | Leaf Scorch, Healthy |
| **Tomato** | Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Two-Spotted Spider Mite, Target Spot, Yellow Leaf Curl Virus (TYLCV), Mosaic Virus (ToMV), Healthy |

---

## 3. Image Preprocessing & Normalization

All ingested leaves undergo standard ImageNet transfer learning normalization:
$$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$

1. **Format Handling**: Converted to 3-channel RGB (alpha channel discarded if PNG).
2. **Bilinear Resizing**: Resampled to $224 \times 224$ pixels.
3. **Tensor Conversion**: Normalized from $[0, 255]$ integer space to $[0.0, 1.0]$ float tensor.
4. **Channel Normalization**: Scaled via standard deviation and shifted via channel mean.

---

## 4. Explainable AI: ViT Grad-CAM

To satisfy transparency and clinical validation requirements, the inference service couples predictions with **Gradient-weighted Class Activation Mapping (Grad-CAM)**:
1. Gradients and forward activations are captured from the final LayerNorm block (`encoder.layers[-1].ln_1`).
2. The `[CLS]` token is separated from the 196 spatial patch tokens ($14 \times 14$).
3. Global average pooled gradients weight the spatial token activations:
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_{k} \alpha_k^c A_k\right)$$
4. The resulting $14 \times 14$ activation map is normalized and upscaled to full image dimensions using bilinear interpolation.
5. A JET heatmap is alpha-blended ($\alpha = 0.45$) over the original leaf to visually delineate the pathogen lesions.

---

## 5. Model Weights & Deployment

- **Weights File**: `backend/saved_models/best_plant_disease_vit.pth` (343 MB)
- **Online Release**: Available for download under the repository's GitHub Releases tab (`v1.0.0`).
- **Classes Mapping**: [`backend/classes.json`](../backend/classes.json)
- **Agronomic Translations**: [`backend/translations.json`](../backend/translations.json) (EN, HI, KN, TE)
