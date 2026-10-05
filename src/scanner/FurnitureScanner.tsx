// ============================================================================
// Modo A: "Mueble Ya Montado" — Reverse Engineering & Assembly Twin UI
// Pipeline: Ingest → Segmentation → Graph → .ikea → 3D Twin
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
} from 'lucide-react';
import { AssemblyTwinViewport } from './modoA/AssemblyTwinViewport.tsx';
import { inventoryAtStep, runModoAFromCanvas, runModoAGeneric } from './modoA/pipeline.ts';
import { ModoAPipelineResult } from './modoA/spatialTypes.ts';

interface FurnitureScannerProps {
  onTransferCode: (code: string) => void;
  /** Optional: notify IDE of active source line for editor sync */
  onHighlightLine?: (line: number | null) => void;
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
  const [analyzing, setAnalyzing] = useState(false);
  const [transferred, setTransferred] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inventory = useMemo(
    () => inventoryAtStep(result, assemblyStep),
    [result, assemblyStep]
  );

  const activeLine = useMemo(() => {
    const step = result.graph.steps.find((s) => s.stepNumber === assemblyStep);
    return step?.codeLineStart ?? null;
  }, [result, assemblyStep]);

  useEffect(() => {
    onHighlightLine?.(activeLine);
  }, [activeLine, onHighlightLine]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const applyResult = useCallback((next: ModoAPipelineResult, fromCapture = true) => {
    setResult(next);
    if (fromCapture) setHasCapture(true);
    setExplosion(0.85);
    setAssemblyStep(0);
    setIsPlaying(false);
    setStage(4);
    window.setTimeout(() => setExplosion(0), 900);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsLiveCamera(true);
        setStage(1);
      }
    } catch {
      alert('No se pudo acceder a la cámara. Usa un preset o sube una imagen.');
    }
  };

  const captureAndAnalyze = async () => {
    setAnalyzing(true);
    setStage(1);
    try {
      const canvas = document.createElement('canvas');
      if (isLiveCamera && videoRef.current) {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
      } else {
        canvas.width = 640;
        canvas.height = 480;
      }
      // Simulate staged pipeline latency for UX
      await new Promise((r) => setTimeout(r, 280));
      setStage(2);
      await new Promise((r) => setTimeout(r, 220));
      setStage(3);
      const next = runModoAFromCanvas(canvas);
      await new Promise((r) => setTimeout(r, 180));
      applyResult(next);
    } finally {
      setAnalyzing(false);
    }
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
      applyResult(next);
      setIsLiveCamera(false);
    } catch {
      alert('No se pudo analizar la imagen.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTransfer = () => {
    onTransferCode(result.sourceCode);
    setTransferred(true);
    setTimeout(() => setTransferred(false), 2200);
  };

  const codeLines = result.sourceCode.split('\n');

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
              Modo A · Mueble Ya Montado
            </h2>
            <p className="text-[11px] text-[#839d8b] truncate">
              Escaneo universal (cualquier mueble) → IkeaLang → Assembly Twin 3D
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-[#1b2f21] text-[#88a38f] border border-[#2b4832]">
            {hasCapture ? 'Captura analizada' : 'Esperando foto o webcam'}
          </span>

          <button
            type="button"
            onClick={startCamera}
            className="px-3 py-1.5 bg-[#1d3324] hover:bg-[#254032] border border-[#2b4832] rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Camera size={14} /> Webcam
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileUpload(f);
            }}
          />

          {isLiveCamera && (
            <button
              type="button"
              disabled={analyzing}
              onClick={() => void captureAndAnalyze()}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {analyzing ? 'Analizando…' : 'Capturar & Deconstruir'}
            </button>
          )}

          <button
            type="button"
            onClick={handleTransfer}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              transferred ? 'bg-emerald-600' : 'bg-[#0058a3] hover:bg-[#004785]'
            }`}
          >
            {transferred ? (
              <>
                <Check size={14} /> Transferido
              </>
            ) : (
              <>
                <ArrowRight size={14} /> Al Taller
              </>
            )}
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
            <span>
              S{n}: {label}
            </span>
          </button>
        ))}
        {analyzing && (
          <span className="ml-2 text-amber-300 animate-pulse">pipeline en curso…</span>
        )}
      </div>

      {/* Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
        {/* Left: 3D Twin / camera */}
        <div className="lg:col-span-7 flex flex-col border-r border-[#213825] min-h-0 relative">
          {isLiveCamera && stage === 1 && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-10"
            />
          )}
          <div className={`flex-1 min-h-0 ${isLiveCamera && stage === 1 ? 'opacity-30' : ''}`}>
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

        {/* Right: inventory + code */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#152319]">
          {/* Stage panels */}
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
              <div className="text-[10px] text-[#88a590]">
                Anclas suelo: {result.graph.groundAnchors.join(', ') || '—'}
                {result.graph.tippingThresholdExceeded && (
                  <span className="text-amber-300"> · ENTRE_DOS recomendado</span>
                )}
              </div>
            </div>
          )}

          <div className="p-3 border-b border-[#27402d]">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8ca893] mb-2 flex items-center justify-between">
              <span>Inventario CV ({result.graph.primitives.length})</span>
              <span className="font-mono text-[#ffdb00]">
                montados {Object.values(inventory).filter((v) => v === 0).length}/
                {result.graph.primitives.length}
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
                      {left === 0 ? '✓' : `${Math.round(p.obb.size.x)}×${Math.round(p.obb.size.y)}mm`}
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
                    className={`px-1 rounded ${
                      hi ? 'bg-[#0058a3]/45 text-white' : 'text-[#cadbd0]'
                    }`}
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
