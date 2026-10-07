# IKEALang Vision Engine (Python)

FastAPI microservice for 3D furniture deconstruction (Trimesh; Open3D optional).

## Setup (recomendado en Windows)

```bash
npm run backend:install
```

Esto instala el motor **sin Open3D**. Trimesh + muestras demos bastan para el IDE.
Open3D es opcional (RANSAC/DBSCAN real sobre nubes de puntos).

### Si quieres Open3D y falla por "Long Path"

1. Activa rutas largas (PowerShell **como Administrador**):

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

2. Reinicia el PC y luego:

```bash
pip install -r backend/requirements-open3d.txt
```

Alternativa sin Long Paths: usa un venv en ruta corta:

```powershell
python -m venv C:\v\ikea
C:\v\ikea\Scripts\activate
pip install -r backend\requirements.txt
pip install open3d
```

## Run

```bash
npm run backend
# http://127.0.0.1:8000
```

Cámara / Gemini (Scantest): `npm run scantest:install` y luego en desktop **Escanear con cámara**.

Health: http://127.0.0.1:8000/api/scan/health  
Docs: http://127.0.0.1:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scan/health` | Health / Open3D-Trimesh flags |
| POST | `/api/scan/analyze` | Upload `.ply` / `.obj` / `.glb` / image |
| GET | `/api/sample/{name}` | Demo structural scan |
