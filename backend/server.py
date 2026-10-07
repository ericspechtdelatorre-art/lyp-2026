# ============================================================================
# KALLAX Studio — FastAPI Spatial Vision Microservice
# Endpoints: GET /api/scan/health , POST /api/scan/analyze
# ============================================================================

from __future__ import annotations

import os

os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYDANTIC_DISABLE_PLUGINS", "1")

import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import FurnitureScanResult
from .vision_engine import VisionEngine, HAS_OPEN3D, HAS_TRIMESH

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kallax-vision")

app = FastAPI(
    title="IKEALang Vision Engine",
    description="Python 3D scan pipeline (Open3D + Trimesh) for KALLAX Studio",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = VisionEngine(proximity_margin_mm=10.0)

MESH_EXTS = {".ply", ".obj", ".glb", ".gltf", ".stl"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


@app.get("/api/scan/health")
@app.get("/health")
def health():
    """IDE connectivity probe."""
    return {
        "status": "ok",
        "service": "ikealang-vision-engine",
        "version": "1.1.0",
        "open3d_available": HAS_OPEN3D,
        "trimesh_available": HAS_TRIMESH,
    }


@app.post("/api/scan/analyze", response_model=FurnitureScanResult)
async def analyze(file: UploadFile = File(...)):
    """
    Accept a 3D mesh (.ply/.obj/.glb/.stl) or RGB frame and return
    FurnitureScanResult (hardware inventory + assembly hierarchy).
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Archivo vacío.")

    filename = file.filename or "scan.obj"
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ".obj"
    logger.info("analyze %s (%d bytes)", filename, len(contents))

    try:
        if ext in MESH_EXTS:
            return engine.analyze_file(contents, filename)
        if ext in IMAGE_EXTS:
            return engine.analyze_image(contents, filename)
        # default: try as mesh, then image
        try:
            return engine.analyze_file(contents, filename)
        except Exception:
            return engine.analyze_image(contents, filename)
    except Exception as exc:
        logger.exception("analyze failed")
        raise HTTPException(status_code=500, detail=f"Fallo en visión 3D: {exc}") from exc


# Legacy aliases (existing scannerApi paths)
@app.post("/api/scan/mesh", response_model=FurnitureScanResult)
async def scan_mesh(file: UploadFile = File(...)):
    return await analyze(file)


@app.post("/api/scan/image", response_model=FurnitureScanResult)
async def scan_image(file: UploadFile = File(...)):
    return await analyze(file)


@app.get("/api/sample/{model_name}", response_model=FurnitureScanResult)
def sample(model_name: str):
    return engine.sample(model_name)


@app.get("/")
def root():
    return {"service": "ikealang-vision-engine", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False)
