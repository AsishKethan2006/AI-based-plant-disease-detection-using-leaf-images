from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from database.db import Base, engine
from routes import auth as auth_routes
from routes import predict as predict_routes

Base.metadata.create_all(bind=engine)

app = FastAPI()


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Plant Foliar Disease Diagnosis API",
        version="1.0.0",
        description="AI-based plant disease detection using leaf images and ViT inference",
        routes=app.routes,
    )

    # Fix the file upload schema for Swagger UI compatibility (OpenAPI 3.1 format: binary)
    for component in openapi_schema.get("components", {}).get("schemas", {}).values():
        for prop in component.get("properties", {}).values():
            if prop.get("contentMediaType") == "application/octet-stream":
                prop.pop("contentMediaType", None)
                prop["format"] = "binary"

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_routes.router)
app.include_router(predict_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}
