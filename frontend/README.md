# LeafScope — frontend

React 19 + Vite + TypeScript + Tailwind CSS client for the FastAPI plant-disease backend.

## Run

```bash
# backend (terminal 1)
cd backend
uvicorn main:app --reload --port 8000

# frontend (terminal 2)
cd frontend
cp .env.example .env      # optional; defaults to http://localhost:8000
npm install
npm run dev               # http://localhost:5173
npm run build             # type-check + production build
```

The backend CORS list allows `http://localhost:5173` and `:3000` only. Keep the dev server on port 5173.

## Notes

- Tokens live in `sessionStorage`; passwords are never stored.
- Login posts `application/x-www-form-urlencoded`; register posts JSON; predict posts multipart field `file`.
- Preferred language is set at registration only. The backend has no update endpoint.
- Without `backend/saved_models/best_plant_disease_vit.pth` the backend runs an untrained model, so predictions are not meaningful.
