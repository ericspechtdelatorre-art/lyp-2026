// ============================================================================
// Modo A: "Mueble Ya Montado" — Multi-view camera scan + Assembly Twin
// ============================================================================

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  ArrowRight,
  Check,
  Layers,
  Sparkles,
  AlertTriangle,
  Box,
  GitBranch,
  Code2,
  RotateCcw,
  Aperture,
  Crosshair,
} from 'lucide-react';
import { AssemblyTwinViewport } from './modoA/AssemblyTwinViewport.tsx';
import {
  inventoryAtStep,
  runModoAFromCanvas,
  runModoAFromMultiView,
  runModoAGeneric,
  runModoAFromDetection,
} from './modoA/pipeline.ts';
import { analyzeFrameMetrics, CalibrationConfig } from './cvDetector.ts';
import {
  DetectedObjectMetrics,
  ModoAPipelineResult,
  RoiMode,
  RoiRect,
  ScanViewId,
} from './modoA/spatialTypes.ts';

interface FurnitureScannerProps {
  onTransferCode: (code: string) => void;
  onHighlightLine?: (line: number | null) => void;
}

const SCAN_VIEWS: Array<{ id: ScanViewId; label: string; prompt: string }> = [
  { id: 'front', label: 'Frente', prompt: 'Enfrente del mueble (frontal)' },
  { id: 'side', label: 'Lateral', prompt: 'Gira 90° — vista lateral' },
  { id: 'top', label: 'Arriba', prompt: 'Desde arriba o 3/4 superior' },
];

interface CapturedViewLocal {
  id: ScanViewId;
  canvas: HTMLCanvasElement;
  thumbnail: string;
  metrics?: import('./modoA/spatialTypes').DetectedObjectMetrics;
}

// ── EMA Smoothing ───────────────────────────────────────────────────────────

const EMA_ALPHA = 0.25;

function lerpN(a: number, b: number): number {
  return Math.round((a + EMA_ALPHA * (b - a)) * 100) / 100;
}

function smoothMetrics(
  prev: DetectedObjectMetrics | null,
  curr: DetectedObjectMetrics
): DetectedObjectMetrics {
  if (!prev) return curr;
  return {
    ...curr,
    dimensions: {
      widthMm: lerpN(prev.dimensions.widthMm, curr.dimensions.widthMm),
      heightMm: lerpN(prev.dimensions.heightMm, curr.dimensions.heightMm),
      thicknessMm: lerpN(prev.dimensions.thicknessMm, curr.dimensions.thicknessMm),
      volumeCm3: lerpN(prev.dimensions.volumeCm3, curr.dimensions.volumeCm3),
      orientationDeg: lerpN(prev.dimensions.orientationDeg, curr.dimensions.orientationDeg),
    },
    density: {
      ...curr.density,
      structuralRatio: lerpN(prev.density.structuralRatio, curr.density.structuralRatio),
      materialDensityGcm3: lerpN(prev.density.materialDensityGcm3, curr.density.materialDensityGcm3),
      effectiveDensityGcm3: lerpN(prev.density.effectiveDensityGcm3, curr.density.effectiveDensityGcm3),
      estimatedMassGrams: Math.round(lerpN(prev.density.estimatedMassGrams, curr.density.estimatedMassGrams)),
    },
    centroid: {
      x: lerpN(prev.centroid.x, curr.centroid.x),
      y: lerpN(prev.centroid.y, curr.centroid.y),
    },
    obbCorners: curr.obbCorners.map((c, i) =>
      prev.obbCorners[i]
        ? { x: lerpN(prev.obbCorners[i].x, c.x), y: lerpN(prev.obbCorners[i].y, c.y) }
        : c
    ),
    principalAxis: {
      start: {
        x: lerpN(prev.principalAxis.start.x, curr.principalAxis.start.x),
        y: lerpN(prev.principalAxis.start.y, curr.principalAxis.start.y),
      },
      end: {
        x: lerpN(prev.principalAxis.end.x, curr.principalAxis.end.x),
        y: lerpN(prev.principalAxis.end.y, curr.principalAxis.end.y),
      },
    },
  };
}

// ── ROI Helpers ──────────────────────────────────────────────────────────────

function computeRoi(canvasW: number, canvasH: number, mode: RoiMode): RoiRect {
  let wFrac: number, hFrac: number;
  switch (mode) {
    case 'horizontal': wFrac = 0.75; hFrac = 0.45; break;
    case 'vertical':   wFrac = 0.35; hFrac = 0.80; break;
    default:           wFrac = 0.70; hFrac = 0.65; break;
  }
  const rw = Math.floor(canvasW * wFrac);
  const rh = Math.floor(canvasH * hFrac);
  return {
    x: Math.floor((canvasW - rw) / 2),
    y: Math.floor((canvasH - rh) / 2),
    width: rw,
    height: rh,
  };
}

const ROI_MODE_LABELS: Record<RoiMode, string> = {
  horizontal: '━ Tablón/Balda',
  vertical: '┃ Columna/Pata',
  libre: '☐ Libre (Mueble)',
};

// ── HUD Drawing ─────────────────────────────────────────────────────────────

function drawRoiFrame(ctx: CanvasRenderingContext2D, roi: RoiRect) {
  const { x, y, width, height } = roi;
  const cornerLen = Math.min(30, width * 0.08, height * 0.08);

  // Dimmed outside area
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, ctx.canvas.width, y);
  ctx.fillRect(0, y + height, ctx.canvas.width, ctx.canvas.height - y - height);
  ctx.fillRect(0, y, x, height);
  ctx.fillRect(x + width, y, ctx.canvas.width - x - width, height);

  // Corner brackets
  ctx.strokeStyle = '#ffdb00';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1], [x + width, y, -1, 1],
    [x, y + height, 1, -1], [x + width, y + height, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + cornerLen * dx, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + cornerLen * dy);
    ctx.stroke();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, m: DetectedObjectMetrics, roi: RoiRect) {
  const cw = ctx.canvas.width;


  // ── Holographic fill ──
  if (m.contourPoints.length > 2) {
    ctx.fillStyle = 'rgba(0, 255, 204, 0.12)';
    ctx.beginPath();
    m.contourPoints.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.fill();
    
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // ── Wireframe Mesh ──
  if (m.wireframeMesh) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#00e5ff';
    
    // Ribbons (costillas)
    m.wireframeMesh.ribbons.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.top.x, r.top.y);
      ctx.lineTo(r.bottom.x, r.bottom.y);
      ctx.stroke();
      ctx.fillRect(r.top.x - 1.5, r.top.y - 1.5, 3, 3);
      ctx.fillRect(r.bottom.x - 1.5, r.bottom.y - 1.5, 3, 3);
    });

    // Spines (nervios)
    m.wireframeMesh.spines.forEach(s => {
      ctx.beginPath();
      s.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      s.forEach(pt => ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3));
    });
  }
  // ── Telemetry label ──
  const { widthMm, heightMm, thicknessMm } = m.dimensions;
  const { effectiveDensityGcm3, structuralRatio, materialClass, estimatedMassGrams } = m.density;
  const classLabel = m.classification === 'TABLON' ? 'TABLÓN / PIEZA ÚNICA'
    : m.classification === 'LISTON' ? 'LISTÓN / PATA'
    : m.classification === 'PANEL' ? 'PANEL'
    : m.classification === 'ESTANTERIA' ? 'ESTANTERÍA'
    : 'MUEBLE';

  const labelX = roi.x + 8;
  const labelY = roi.y + roi.height + 18;
  const lines = [
    `Tipo: ${classLabel}`,
    `Tamaño: ${widthMm} × ${heightMm} mm | Grosor: ${thicknessMm} mm`,
    `Densidad: ${effectiveDensityGcm3} g/cm³ | Solidez: ${Math.round(structuralRatio * 100)}% | ${materialClass}`,
    `Masa: ~${estimatedMassGrams} g | Huecos: ${m.internalHoles}`,
  ];

  const lineH = 16;
  const boxH = lines.length * lineH + 10;
  const boxW = Math.min(380, cw - labelX - 10);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(labelX - 4, labelY - lineH, boxW, boxH);

  ctx.font = '11px monospace';
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#00ffcc' : '#ffffff';
    ctx.fillText(line, labelX, labelY + i * lineH);
  });
}

// ── Component ───────────────────────────────────────────────────────────────

function grabFrameFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d')?.drawImage(video, 0, 0);
  return canvas;
}

export const FurnitureScanner: React.FC<FurnitureScannerProps> = ({
  onTransferCode,
  onHighlightLine,
}) => {
  const [hasCapture, setHasCapture] = useState(false);
  const [result, setResult] = useState<ModoAPipelineResult>(() => runModoAGeneric());
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(4);
  const [explosion, setExplosion] = useState(0);
  const [assemblyStep, setAssemblyStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [captures, setCaptures] = useState<CapturedViewLocal[]>([]);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [roiMode, setRoiMode] = useState<RoiMode>('libre');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metricsRef = useRef<DetectedObjectMetrics | null>(null);
  const bgGrayRef = useRef<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<DetectedObjectMetrics | null>(null);
  const [mmPerPixel] = useState<number>(0.45);

  // ── Live frame processing ──
  const processVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const roi = computeRoi(canvas.width, canvas.height, roiMode);
    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const rawDetection = analyzeFrameMetrics(
      frameData,
      { mmPerPixel, depthPerspectiveFactor: 1.15 },
      roi,
      bgGrayRef.current || undefined
    );

    // Draw ROI frame always
    drawRoiFrame(ctx, roi);

    if (rawDetection) {
      const stabilized = smoothMetrics(metricsRef.current, rawDetection);
      metricsRef.current = stabilized;
      setMetrics(stabilized);
      drawHud(ctx, stabilized, roi);
    } else {
      metricsRef.current = null;
      setMetrics(null);
      // "No object" label
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = '13px monospace';
      ctx.fillText('Coloca el objeto dentro del marco', roi.x + 10, roi.y + roi.height / 2);
    }
  }, [mmPerPixel, roiMode]);

  useEffect(() => {
    if (!isLiveCamera) return;
    let animId: number;
    const loop = () => { processVideoFrame(); animId = requestAnimationFrame(loop); };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isLiveCamera, processVideoFrame]);

  // ── Calibrate background ──
  const calibrateBackground = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const tmpCanvas = document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (!tmpCtx) return;
    tmpCtx.drawImage(video, 0, 0);
    const data = tmpCtx.getImageData(0, 0, w, h);
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      gray[i] = Math.round(0.299 * data.data[idx] + 0.587 * data.data[idx + 1] + 0.114 * data.data[idx + 2]);
    }
    bgGrayRef.current = gray;
  }, []);

  // ── Analyze from live metrics ──
  const analyzeFromLiveMetrics = useCallback(() => {
    const m = metricsRef.current;
    if (!m) return;
    setAnalyzing(true);
    setStage(1);
    setTimeout(() => {
      setStage(2);
      setTimeout(() => {
        setStage(3);
        try {
          const next = runModoAFromDetection(m);
          setTimeout(() => {
            setResult(next);
            setHasCapture(true);
            setExplosion(0.85);
            setAssemblyStep(0);
            setIsPlaying(false);
            setStage(4);
            setTimeout(() => setExplosion(0), 900);
            setAnalyzing(false);
          }, 150);
        } catch {
          setAnalyzing(false);
        }
      }, 200);
    }, 200);
  }, []);

  const inventory = useMemo(
    () => inventoryAtStep(result, assemblyStep),
    [result, assemblyStep]
  );

  const activeLine = useMemo(() => {
    const step = result.graph.steps.find((s) => s.stepNumber === assemblyStep);
    return step?.codeLineStart ?? null;
  }, [result, assemblyStep]);

  const activeView = SCAN_VIEWS[Math.min(activeViewIndex, SCAN_VIEWS.length - 1)];
  const allViewsCaptured = SCAN_VIEWS.every((v) => captures.some((c) => c.id === v.id));

  useEffect(() => { onHighlightLine?.(activeLine); }, [activeLine, onHighlightLine]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (!isLiveCamera || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
    void video.play().catch(() => {});
  }, [isLiveCamera]);

  const applyResult = useCallback((next: ModoAPipelineResult, fromCapture = true) => {
    setResult(next);
    if (fromCapture) setHasCapture(true);
    setExplosion(0.85);
    setAssemblyStep(0);
    setIsPlaying(false);
    setStage(4);
    window.setTimeout(() => setExplosion(0), 900);
  }, []);

  const resetCaptures = useCallback(() => {
    setCaptures([]);
    setActiveViewIndex(0);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsLiveCamera(false);
    bgGrayRef.current = null;
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'Este entorno no soporta webcam (mediaDevices no disponible).';
      setCameraError(msg);
      alert(msg);
      return;
    }

    stopCamera();
    resetCaptures();

    const tryConstraints: MediaStreamConstraints[] = [
      { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { audio: false, video: true },
    ];

    let lastErr: unknown = null;
    for (const constraints of tryConstraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setStage(1);
        setIsLiveCamera(true);
        return;
      } catch (err) { lastErr = err; }
    }

    const name = lastErr instanceof DOMException ? lastErr.name : 'Error';
    const msg =
      name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Permiso de cámara denegado.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No se encontró ninguna webcam conectada.'
          : 'No se pudo abrir la webcam.';
    setCameraError(msg);
    alert(msg);
  };

  const analyzeMultiView = async (views: CapturedViewLocal[]) => {
    setAnalyzing(true);
    setStage(1);
    try {
      await new Promise((r) => setTimeout(r, 220));
      setStage(2);
      await new Promise((r) => setTimeout(r, 200));
      setStage(3);
      
      const fullViews = views.map(v => ({
        id: v.id,
        thumbnailDataUrl: v.thumbnail,
        majorDimMm: Math.max(v.metrics?.dimensions.widthMm || 0, v.metrics?.dimensions.heightMm || 0),
        minorDimMm: Math.min(v.metrics?.dimensions.widthMm || 0, v.metrics?.dimensions.heightMm || 0),
        solidity: v.metrics?.structuralSolidity || 0,
        holeCount: v.metrics?.internalHoles || 0,
        textureDensityScore: 0,
        materialDensityGcm3: v.metrics?.density.materialDensityGcm3 || 0
      }));
      const next = views.every(v => v.metrics) && views.length === 3 
        ? (await import('./modoA/pipeline')).runModoAFromThreeViews(fullViews)
        : (await import('./modoA/pipeline')).runModoAFromMultiView(views.map((v) => ({ id: v.id, canvas: v.canvas })));

      await new Promise((r) => setTimeout(r, 160));
      stopCamera();
      applyResult(next);
    } finally { setAnalyzing(false); }
  };

  const captureCurrentView = async () => {
    if (!videoRef.current || !isLiveCamera) return;
    const view = SCAN_VIEWS[activeViewIndex];
    if (!view) return;

    const canvas = grabFrameFromVideo(videoRef.current);
    const thumbnail = canvas.toDataURL('image/jpeg', 0.72);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);

    
    const m = metricsRef.current;
    const nextCaptures = [
      ...captures.filter((c) => c.id !== view.id),
      { id: view.id, canvas, thumbnail, metrics: m || undefined },
    ];

    setCaptures(nextCaptures);

    const nextIndex = activeViewIndex + 1;
    if (nextIndex < SCAN_VIEWS.length) { setActiveViewIndex(nextIndex); return; }
    await analyzeMultiView(nextCaptures);
  };

  const retakeActiveView = () => {
    const view = SCAN_VIEWS[activeViewIndex];
    if (!view) return;
    setCaptures((prev) => prev.filter((c) => c.id !== view.id));
  };

  const handleFileUpload = async (file: File) => {
    setAnalyzing(true);
    setStage(1);
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext('2d')?.drawImage(bmp, 0, 0);
      setStage(2);
      await new Promise((r) => setTimeout(r, 200));
      setStage(3);
      const next = runModoAFromCanvas(canvas);
      await new Promise((r) => setTimeout(r, 150));
      stopCamera();
      resetCaptures();
      applyResult(next);
    } catch { alert('No se pudo analizar la imagen.'); }
    finally { setAnalyzing(false); }
  };

  const handleTransfer = () => {
    onTransferCode(result.sourceCode);
    setTransferred(true);
    setTimeout(() => setTransferred(false), 2200);
  };

  const codeLines = result.sourceCode.split('\n');

  const roiModes: RoiMode[] = ['horizontal', 'vertical', 'libre'];

  return (
    <div className="w-full h-full flex flex-col bg-[#0f1b13] overflow-hidden select-none text-[#e4eee6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#142318] border-b border-[#213825] gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-[#ffdb00] text-[#0e1b12] rounded-xl shrink-0">
            <Camera size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm tracking-tight truncate">
              Modo A · Escáner CV
            </h2>
            <p className="text-[11px] text-[#839d8b] truncate">
              Marco virtual ROI → PCA + Grosor + Densidad → Clasificación → IkeaLang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-[#1b2f21] text-[#88a38f] border border-[#2b4832]">
            {hasCapture
              ? result.viewCount && result.viewCount > 1
                ? `Reconstruido desde ${result.viewCount} vistas`
                : 'Captura analizada'
              : isLiveCamera
                ? metrics
                  ? `${metrics.classification} · ${metrics.dimensions.widthMm}×${metrics.dimensions.heightMm}mm`
                  : 'Webcam activa'
                : 'Esperando foto o webcam'}
          </span>

          <button
            type="button"
            onClick={() => void (isLiveCamera ? stopCamera() : startCamera())}
            className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isLiveCamera
                ? 'bg-emerald-800/80 border-emerald-600 hover:bg-emerald-700'
                : 'bg-[#1d3324] hover:bg-[#254032] border-[#2b4832]'
            }`}
          >
            <Camera size={14} /> {isLiveCamera ? 'Cerrar Webcam' : 'Webcam'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-[#1d3324] hover:bg-[#254032] border border-[#2b4832] rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Upload size={14} /> Imagen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }}
          />

          {isLiveCamera && (
            <>
              {/* ROI mode selector */}
              <div className="flex items-center gap-0.5 bg-[#1b2f21] rounded-lg border border-[#2b4832] overflow-hidden">
                {roiModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRoiMode(m)}
                    className={`px-2 py-1 text-[10px] font-bold ${
                      roiMode === m
                        ? 'bg-[#ffdb00] text-[#0e1b12]'
                        : 'text-[#88a38f] hover:text-white'
                    }`}
                  >
                    {ROI_MODE_LABELS[m]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={calibrateBackground}
                className="px-2.5 py-1.5 bg-[#1d3324] border border-[#2b4832] hover:bg-[#254032] rounded-xl text-[10px] font-bold flex items-center gap-1"
                title="Captura el fondo vacío para restar ruido"
              >
                <Crosshair size={12} /> Calibrar Fondo
              </button>

              <button
                type="button"
                disabled={analyzing || !metrics}
                onClick={analyzeFromLiveMetrics}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Aperture size={14} />
                {analyzing ? 'Analizando…' : 'Capturar y Analizar'}
              </button>

              <button
                type="button"
                disabled={analyzing}
                onClick={() => void captureCurrentView()}
                className="px-3 py-1.5 bg-[#0058a3] hover:bg-[#004785] rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Layers size={14} />
                {allViewsCaptured ? 'Analizar 3D' : `Vista ${activeView.label} (${activeViewIndex + 1}/3)`}
              </button>

              {captures.length > 0 && (
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={resetCaptures}
                  className="px-2.5 py-1.5 bg-[#1d3324] border border-[#2b4832] hover:bg-[#254032] rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleTransfer}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              transferred ? 'bg-emerald-600' : 'bg-[#0058a3] hover:bg-[#004785]'
            }`}
          >
            {transferred ? <><Check size={14} /> Transferido</> : <><ArrowRight size={14} /> Al Taller</>}
          </button>
        </div>
      </div>

      {/* Pipeline stage strip */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[#121f16] border-b border-[#1e3224] text-[10px] font-mono overflow-x-auto">
        {[
          { n: 1 as const, label: 'Segmentación OBB', icon: Layers },
          { n: 2 as const, label: 'Grafo topológico', icon: GitBranch },
          { n: 3 as const, label: 'Síntesis .ikea', icon: Code2 },
          { n: 4 as const, label: 'Assembly Twin', icon: Box },
        ].map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            type="button"
            onClick={() => setStage(n)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              stage === n
                ? 'bg-[#253f2c] border-[#ffdb00]/40 text-[#ffdb00]'
                : 'border-transparent text-[#7a9582] hover:text-[#c5d9cb]'
            }`}
          >
            <Icon size={12} />
            <span>S{n}: {label}</span>
          </button>
        ))}
        {analyzing && <span className="ml-2 text-amber-300 animate-pulse">pipeline en curso…</span>}
      </div>

      {/* Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
        <div className="lg:col-span-7 flex flex-col border-r border-[#213825] min-h-0 relative">
          {isLiveCamera && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover z-10 bg-black"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover z-[15] pointer-events-none"
              />
            </>
          )}

          {flash && (
            <div className="absolute inset-0 z-30 bg-white/70 pointer-events-none animate-pulse" />
          )}

          {isLiveCamera && (
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-red-700/90 text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  WEBCAM · ROI {ROI_MODE_LABELS[roiMode]}
                  {bgGrayRef.current ? ' · BG ✓' : ''}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/70 text-[#ffdb00] border border-[#ffdb00]/30">
                  {captures.length > 0 ? `Vistas ${captures.length}/3 · ${activeView.prompt}` : 'Coloca el objeto en el marco'}
                </span>
              </div>

              {/* Thumbnail strip */}
              {captures.length > 0 && (
                <div className="flex gap-2 pointer-events-auto">
                  {SCAN_VIEWS.map((v, i) => {
                    const cap = captures.find((c) => c.id === v.id);
                    const isActive = i === activeViewIndex;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setActiveViewIndex(i)}
                        className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 text-left ${
                          isActive ? 'border-[#ffdb00]' : cap ? 'border-emerald-500/70' : 'border-white/20'
                        }`}
                      >
                        {cap ? (
                          <img src={cap.thumbnail} alt={v.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-black/50 flex items-center justify-center text-[10px] font-mono text-white/70">
                            {i + 1}. {v.label}
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center py-0.5">
                          {v.label}{cap ? ' ✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                  {captures.some((c) => c.id === activeView.id) && (
                    <button
                      type="button"
                      onClick={retakeActiveView}
                      className="px-2 rounded-lg bg-black/60 border border-white/20 text-[10px] font-bold hover:bg-black/80"
                    >
                      Repetir
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {cameraError && !isLiveCamera && (
            <div className="absolute bottom-3 left-3 right-3 z-20 text-[11px] font-mono px-3 py-2 rounded-lg bg-red-950/90 border border-red-700/50 text-red-100">
              {cameraError}
            </div>
          )}

          <div className={`flex-1 min-h-0 ${isLiveCamera ? 'opacity-0 pointer-events-none' : ''}`}>
            <AssemblyTwinViewport
              graph={result.graph}
              explosion={explosion}
              assemblyStep={assemblyStep}
              isPlaying={isPlaying}
              onExplosionChange={setExplosion}
              onAssemblyStepChange={setAssemblyStep}
              onPlayingChange={setIsPlaying}
              collisionFlags={result.collisionFlags}
              activeCodeLine={activeLine}
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#152319]">
          {stage === 2 && (
            <div className="p-3 border-b border-[#27402d] text-xs space-y-2 max-h-40 overflow-y-auto">
              <h3 className="font-bold text-[#ffdb00] text-[11px] uppercase tracking-wider">
                Contact Graph · {result.graph.joints.length} uniones
              </h3>
              {result.graph.joints.slice(0, 12).map((j) => (
                <div key={j.id} className="font-mono text-[10px] text-[#9bc2a4]">
                  {j.aId} ↔ {j.bId} · {j.jointType} · fuerza {j.strength.toFixed(2)}
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border-b border-[#27402d]">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8ca893] mb-2 flex items-center justify-between">
              <span>Inventario CV ({result.graph.primitives.length})</span>
              <span className="font-mono text-[#ffdb00]">
                {result.viewCount && result.viewCount > 1
                  ? `${result.viewCount} vistas`
                  : `${Object.values(inventory).filter((v) => v === 0).length}/${result.graph.primitives.length}`}
              </span>
            </h3>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {result.graph.primitives.map((p) => {
                const left = inventory[p.id] ?? 1;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-mono ${
                      left === 0
                        ? 'bg-emerald-950/40 border-emerald-800/50 opacity-60'
                        : 'bg-[#111e15] border-[#263e2c]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.materialTone }}
                      />
                      <span className="truncate">{p.name}</span>
                      <span className="text-[#6d8674]">{p.kind}</span>
                    </div>
                    <span className="text-[#88a590] shrink-0">
                      {left === 0
                        ? '✓'
                        : `${Math.round(p.obb.size.x)}×${Math.round(p.obb.size.y)}×${Math.round(p.obb.size.z)}mm`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {result.collisionFlags.length > 0 && (
            <div className="px-3 py-2 bg-red-950/40 border-b border-red-800/40 text-[11px] text-red-200 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                {result.collisionFlags.map((c, i) => (
                  <p key={i}>{c.message}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2b4832]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#ffdb00]" />
                <span className="text-[11px] font-bold text-[#ffdb00] uppercase tracking-wider">
                  Código sintetizado
                </span>
              </div>
              <span className="text-[10px] text-[#86a68f] font-mono">
                {result.graph.steps.length} PASOS
              </span>
            </div>

            <pre className="flex-1 overflow-auto text-[11px] font-mono leading-relaxed select-text p-2 bg-[#0c1610] rounded-xl border border-[#1f3725]">
              {codeLines.map((line, i) => {
                const ln = i + 1;
                const hi =
                  activeLine != null &&
                  result.graph.steps.some(
                    (s) =>
                      s.stepNumber === assemblyStep &&
                      s.codeLineStart != null &&
                      s.codeLineEnd != null &&
                      ln >= s.codeLineStart &&
                      ln <= s.codeLineEnd
                  );
                return (
                  <div
                    key={i}
                    className={`px-1 rounded ${hi ? 'bg-[#0058a3]/45 text-white' : 'text-[#cadbd0]'}`}
                  >
                    <span className="inline-block w-7 text-[#4d6556] select-none">{ln}</span>
                    {line || ' '}
                  </div>
                );
              })}
            </pre>

            <button
              type="button"
              onClick={handleTransfer}
              className="mt-3 w-full py-2 bg-[#ffdb00] hover:bg-[#e6c500] text-[#0f1b13] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2"
            >
              <ArrowRight size={15} /> Cargar en Mesa de Taller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
