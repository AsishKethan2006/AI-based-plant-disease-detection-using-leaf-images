# Automated Plant Foliar Disease Diagnosis and Explainability System

An end-to-end computer vision platform engineered to diagnose foliar pathologies across key agricultural cultivars (tomato, potato, maize, and rice). The system couples convolutional neural network (CNN) inference with Gradient-weighted Class Activation Mapping (Grad-CAM) to provide transparent visual explainability and multi-language agronomic advisories across English, Hindi, Kannada, and Telugu.

---

## 1. Project Architecture

The repository is structured as a multi-component workspace separating concern across the inference service, model training pipeline, client interface, and technical documentation:

```
.
├── backend/                      # FastAPI asynchronous REST backend
│   ├── auth/                     # JWT authentication, password hashing (bcrypt)
│   ├── database/                 # SQLAlchemy ORM models, SQLite database connector
│   ├── saved_models/             # Local storage directory for trained model weights
│   ├── routes/                   # API endpoint routers (auth, predict)
│   ├── static/uploads/           # Ingested image assets and Grad-CAM visualizations
│   ├── HANDOFF.md                # ML integration specifications and inference contracts
│   ├── requirements.txt          # Python runtime dependencies
│   ├── test.py                   # Automated endpoint and security test suite
│   ├── translations.json         # Agronomic advisory taxonomy (EN, HI, KN, TE)
│   ├── main.py                   # Application entry point, CORS, and static mount
│   ├── schemas.py                # Pydantic data schemas
│   └── .env.example              # Environment variable template
├── frontend/                     # Client web application (React / Vite)
├── ml/                           # Model training notebooks, preprocessing, and evaluation
├── docs/                         # Engineering reports, architecture schematics, slides
└── .gitignore                    # Multi-stack version control exclusion rules
```

---

## 2. Technical Stack and Methodological Foundations

### A. Deep Learning & Visual Explainability (`ml/`)
* **Scope**: Targeted disease detection for *Solanum lycopersicum* (Tomato), *Solanum tuberosum* (Potato), *Zea mays* (Maize), and *Oryza sativa* (Rice) using an extracted, verified subset of the PlantVillage benchmark.
* **Explainable AI**: Employs Grad-CAM (Selvaraju et al., 2017) to compute the gradient of the predicted class score with respect to feature maps of the final convolutional layer, rendering spatial heatmaps that validate pathogen localization against genuine pathological indicators rather than background artifacts.

### B. RESTful Backend Service (`backend/`)
* **Framework**: FastAPI (ASGI) with Pydantic type validation.
* **Database & ORM**: SQLite datastore managed through SQLAlchemy 2.0.
* **Security**: Stateless JSON Web Token (JWT) authorization conforming to RFC 7519; passwords salted and hashed using standard bcrypt algorithms; restricted upload bounds (10MB limit) to preclude denial-of-service vulnerabilities.
* **Agronomic Localization**: Language-adaptive diagnostic layer mapping standardized disease classifications into regional vernaculars (Hindi, Kannada, Telugu) alongside English.

### C. Client Application (`frontend/`)
* Single-page reactive application facilitating leaf image capture, secure token caching, real-time prediction rendering, Grad-CAM visualization inspection, and user historical log retrieval.

---

## 3. Team Responsibilities (VTU B.Tech Project)

* **Backend Development**: API engineering, database design, JWT authentication, localization lookup engine, security auditing, and inference integration contracts.
* **Machine Learning**: Dataset preprocessing, CNN architecture selection/training, hyperparameter optimization, and Grad-CAM implementation.
* **Frontend Engineering**: User interface development, state management, localized display rendering, and REST endpoint integration.
* **Testing & Deployment**: Automated test verification, integration testing, containerization, and deployment orchestration.

---

## 4. Local Development Setup

### Backend Service Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure Python virtual environment:
   ```bash
   python -m venv venv
   # Linux/macOS: source venv/bin/activate
   # Windows: .\venv\Scripts\activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update SECRET_KEY and DATABASE_URL in .env as necessary
   ```
5. Execute automated test suite:
   ```bash
   python test.py
   ```
6. Start the local server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   Interactive API documentation is accessible at `http://localhost:8000/docs`.

---

## 5. References

1. Hughes, D. P., & Salathé, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. *arXiv preprint arXiv:1511.08060*.
2. Selvaraju, R. R., Cogswell, M., Das, A., Vedaldi, A., Parikh, D., & Batra, D. (2017). Grad-CAM: Visual explanations from deep networks via gradient-based localization. In *Proceedings of the IEEE International Conference on Computer Vision (ICCV)*, pp. 618-626.
