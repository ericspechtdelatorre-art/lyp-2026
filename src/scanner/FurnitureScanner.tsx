// ============================================================================
// IKEALang v1.1 - MODE 3: "Escáner de Despiece" (CV & Reverse Assembly UI)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  ComputerVisionDeconstructor,
  DetectionResult,
  DetectedPart,
} from './cvDetector.ts';
import {
  Camera,
  Upload,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  ChevronRight,
} from 'lucide-react';

interface FurnitureScannerProps {
  onTransferCode: (code: string) => void;
}

export const FurnitureScanner: React.FC<FurnitureScannerProps> = ({ onTransferCode }) => {
  const [selectedPreset, setSelectedPreset] = useState<'lack' | 'kallax' | 'alex'>('kallax');
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [detection, setDetection] = useState<DetectionResult>(
    ComputerVisionDeconstructor.analyzePreset('kallax')
  );
  const [explosionAmount, setExplosionAmount] = useState(0); // 0 to 100%
  const [reverseStepIndex, setReverseStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'scan' | 'exploded' | 'code'>('scan');
  const [transferred, setTransferred] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Switch preset
  const handlePresetChange = (preset: 'lack' | 'kallax' | 'alex') => {
    setSelectedPreset(preset);
    setIsLiveCamera(false);
    const res = ComputerVisionDeconstructor.analyzePreset(preset);
    setDetection(res);
    setReverseStepIndex(0);
    setExplosionAmount(0);
    setTransferred(false);
  };

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsLiveCamera(true);
      }
    } catch (err) {
      alert('No se pudo acceder a la cámara del dispositivo. Mostrando preset de prueba.');
    }
  };

  const handleTransfer = () => {
    onTransferCode(detection.generatedCode);
    setTransferred(true);
    setTimeout(() => setTransferred(false), 2500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f3efe6] dark:bg-[#0f1b13] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#eae2d0] dark:bg-[#142318] border-b border-[#d8cca8] dark:border-[#213825]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0058a3] dark:bg-[#ffdb00] text-white dark:text-[#0e1b12] rounded-xl shadow-sm">
            <Camera size={20} />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-[#2d2822] dark:text-[#e4eee6] tracking-tight">
              ESCÁNER DE DESPIECE & INGENIERÍA INVERSA
            </h2>
            <p className="text-xs text-[#7d6d59] dark:text-[#839d8b]">
              Detección espacial de paneles, patas y herrajes $\rightarrow$ Deconstrucción a IkeaLang AST
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center bg-[#ded3be] dark:bg-[#1b2f21] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handlePresetChange('kallax')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedPreset === 'kallax'
                  ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                  : 'text-[#6f5e4b] dark:text-[#88a38f]'
              }`}
            >
              KALLAX 2x2
            </button>
            <button
              onClick={() => handlePresetChange('lack')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedPreset === 'lack'
                  ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                  : 'text-[#6f5e4b] dark:text-[#88a38f]'
              }`}
            >
              Mesa LACK
            </button>
            <button
              onClick={() => handlePresetChange('alex')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedPreset === 'alex'
                  ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                  : 'text-[#6f5e4b] dark:text-[#88a38f]'
              }`}
            >
              Cajonera ALEX
            </button>
          </div>

          <button
            onClick={startCamera}
            className="px-3 py-1.5 bg-white dark:bg-[#1d3324] hover:bg-neutral-100 text-[#2d2822] dark:text-[#e4eee6] border border-[#cfc1a5] dark:border-[#2b4832] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Camera size={14} /> Webcam Live
          </button>

          <button
            onClick={handleTransfer}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              transferred
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0058a3] hover:bg-[#004785] text-white'
            }`}
          >
            {transferred ? (
              <>
                <Check size={14} /> ¡Transferido al Taller!
              </>
            ) : (
              <>
                <ArrowRight size={14} /> Transferir al Taller
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Scanner Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-6 overflow-hidden">
        {/* Left Column: Spatial Visualizer with CV Bounding Box Overlays */}
        <div className="lg:col-span-7 flex flex-col bg-[#ede5d3] dark:bg-[#152319] border-2 border-[#cfc1a5] dark:border-[#27402d] rounded-2xl overflow-hidden shadow-inner">
          {/* View Mode Switcher */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#e2d8c3] dark:bg-[#1b2e21] border-b border-[#cfc1a5] dark:border-[#27402d]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#4e4334] dark:text-[#9bc2a4]">
                RED NEURONAL CV: {detection.furnitureName}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#d5c9b0] dark:bg-[#132217] p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-2.5 py-1 rounded-md font-semibold ${
                  activeTab === 'scan'
                    ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                    : 'text-[#6b5b48] dark:text-[#88a38f]'
                }`}
              >
                Detección Espacial
              </button>
              <button
                onClick={() => setActiveTab('exploded')}
                className={`px-2.5 py-1 rounded-md font-semibold ${
                  activeTab === 'exploded'
                    ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                    : 'text-[#6b5b48] dark:text-[#88a38f]'
                }`}
              >
                Despiece AR 3D
              </button>
            </div>
          </div>

          {/* Viewport Content */}
          <div className="relative flex-1 bg-[#1a1c1e] flex items-center justify-center overflow-hidden">
            {isLiveCamera && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}

            {/* If not live camera, show rich geometric blueprint representation */}
            {!isLiveCamera && (
              <div className="relative w-full h-full flex items-center justify-center p-8 bg-[radial-gradient(#253d2c_1px,transparent_1px)] [background-size:16px_16px] bg-[#121c15]">
                {/* SVG Blueprint Furniture Representation */}
                <div
                  className="relative w-80 h-80 transition-all duration-300"
                  style={{
                    transform:
                      activeTab === 'exploded'
                        ? `scale(${1 - explosionAmount * 0.002}) rotateX(${explosionAmount * 0.3}deg)`
                        : 'none',
                  }}
                >
                  {detection.parts.map((part, idx) => {
                    const explodeOffset = (explosionAmount / 100) * (idx % 2 === 0 ? 40 : -40);
                    return (
                      <div
                        key={part.id}
                        className="absolute border-2 border-dashed rounded transition-all duration-300 flex items-center justify-center group"
                        style={{
                          left: `${part.bbox.x * 100}%`,
                          top: `${part.bbox.y * 100}%`,
                          width: `${part.bbox.width * 100}%`,
                          height: `${part.bbox.height * 100}%`,
                          borderColor: part.color,
                          backgroundColor: `${part.color}22`,
                          transform:
                            activeTab === 'exploded'
                              ? `translate(${explodeOffset}px, ${explodeOffset * 1.5}px)`
                              : 'none',
                        }}
                      >
                        {/* Dimension tag */}
                        <div
                          className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white shadow-sm opacity-90 group-hover:opacity-100"
                          style={{ backgroundColor: part.color }}
                        >
                          {part.name} ({part.dimensions.width}x{part.dimensions.height}mm)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exploded AR Slider Bar */}
            {activeTab === 'exploded' && (
              <div className="absolute bottom-4 inset-x-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-4 text-white">
                <Sliders size={16} className="text-[#ffdb00]" />
                <span className="text-xs font-bold whitespace-nowrap">
                  Desensamblaje AR: {explosionAmount}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explosionAmount}
                  onChange={(e) => setExplosionAmount(Number(e.target.value))}
                  className="w-full accent-[#ffdb00] cursor-pointer"
                />
                <button
                  onClick={() => setExplosionAmount(explosionAmount === 0 ? 80 : 0)}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold whitespace-nowrap"
                >
                  {explosionAmount === 0 ? 'Explotar' : 'Unir'}
                </button>
              </div>
            )}
          </div>

          {/* Reverse Assembly Stepper Bar */}
          <div className="p-3 bg-[#e8dfcf] dark:bg-[#182b1d] border-t border-[#cfc1a5] dark:border-[#27402d] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <RotateCcw size={15} className="text-[#0058a3] dark:text-[#ffdb00]" />
              <span className="font-bold text-[#3d3326] dark:text-[#e4eee6]">
                Despiece Inverso Paso a Paso:
              </span>
              <span className="font-mono text-[#0058a3] dark:text-[#ffdb00]">
                {detection.reverseSteps[reverseStepIndex]?.action || 'Despiece concluido'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={reverseStepIndex === 0}
                onClick={() => setReverseStepIndex(i => Math.max(0, i - 1))}
                className="px-2 py-1 bg-white dark:bg-[#253f2c] rounded border border-[#cfc1a5] dark:border-[#2b4832] disabled:opacity-40"
              >
                Paso Anterior
              </button>
              <button
                disabled={reverseStepIndex >= detection.reverseSteps.length - 1}
                onClick={() => setReverseStepIndex(i => Math.min(detection.reverseSteps.length - 1, i + 1))}
                className="px-2 py-1 bg-[#0058a3] text-white dark:bg-[#ffdb00] dark:text-[#111] rounded font-bold disabled:opacity-40"
              >
                Paso Siguiente
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Deconstructed Inventory & Generated IkeaLang Source */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
          {/* Card 1: Detected Parts Hardware Inventory */}
          <div className="bg-[#ede5d3] dark:bg-[#152319] border-2 border-[#cfc1a5] dark:border-[#27402d] rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#63533e] dark:text-[#8ca893] mb-3 flex items-center justify-between">
              <span>Inventario Detectado por CV ({detection.parts.length} piezas)</span>
              <span className="text-[#0058a3] dark:text-[#ffdb00] font-mono">
                {detection.estimatedScrews} tornillos / {detection.estimatedDowels} clavijas
              </span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {detection.parts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#111e15] border border-[#ded3be] dark:border-[#263e2c] text-xs font-mono shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-bold text-[#2d2822] dark:text-[#dce6df]">{p.name}</span>
                  </div>
                  <div className="text-[#7f6e5b] dark:text-[#88a590] text-[11px]">
                    {p.dimensions.width}×{p.dimensions.height}×{p.dimensions.depth}mm
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Generated IkeaLang Source Code Preview */}
          <div className="flex-1 flex flex-col bg-[#142118] border-2 border-[#2b4832] rounded-2xl p-4 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2b4832]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#ffdb00]" />
                <span className="text-xs font-bold text-[#ffdb00] uppercase tracking-wider">
                  Código IkeaLang Reconstruido
                </span>
              </div>
              <span className="text-[11px] text-[#86a68f] font-mono">.ikea generado</span>
            </div>

            <pre className="flex-1 overflow-y-auto text-[11px] font-mono text-[#cadbd0] leading-relaxed select-text p-2 bg-[#0c1610] rounded-xl border border-[#1f3725]">
              {detection.generatedCode}
            </pre>

            <button
              onClick={handleTransfer}
              className="mt-3 w-full py-2 bg-[#ffdb00] hover:bg-[#e6c500] text-[#0f1b13] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <ArrowRight size={15} /> Cargar en Mesa de Taller & Caja de Montaje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
