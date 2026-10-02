// ============================================================================
// IKEALang v1.1 - 3D Assembly Inspector Viewport (Three.js Real-time Blueprint)
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { buildFurnitureModel, FurnitureAssemblyMesh } from './furnitureModels.ts';
import {
  Box,
  Eye,
  RotateCw,
  Sliders,
  Maximize2,
  Sparkles,
  Compass,
} from 'lucide-react';

interface AssemblyViewport3dProps {
  currentStep: number;
  totalSteps: number;
  modelId?: 'lack' | 'kallax' | 'alex' | 'pax' | 'chair' | 'generic';
  stepDescription?: string;
}

export const AssemblyViewport3d: React.FC<AssemblyViewport3dProps> = ({
  currentStep,
  totalSteps,
  modelId = 'lack',
  stepDescription,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [styleMode, setStyleMode] = useState<'blueprint' | 'wood' | 'manual'>('blueprint');
  const [explodeSlider, setExplodeSlider] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // References for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelMeshRef = useRef<FurnitureAssemblyMesh | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background color based on mode
    scene.background = new THREE.Color(
      styleMode === 'blueprint' ? 0x0a192f : styleMode === 'manual' ? 0xf4f1ea : 0x1a261d
    );

    // 2. Camera: Isometric angle
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 14);
    camera.lookAt(0, 2.5, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // 4. Lighting & Environment Grid
    const ambientLight = new THREE.AmbientLight(0xffffff, styleMode === 'blueprint' ? 0.7 : 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(
      16,
      16,
      styleMode === 'blueprint' ? 0x00bcd4 : 0x8c7653,
      styleMode === 'blueprint' ? 0x1b3a5b : 0x3d4a3e
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 5. Build procedural furniture model
    const furnitureMesh = buildFurnitureModel(modelId, styleMode);
    scene.add(furnitureMesh.group);
    modelMeshRef.current = furnitureMesh;

    furnitureMesh.updateStep(currentStep, totalSteps, explodeSlider);

    // 6. Animation loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (autoRotate && furnitureMesh.group) {
        furnitureMesh.group.rotation.y += 0.006;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      furnitureMesh.dispose();
      renderer.dispose();
    };
  }, [modelId, styleMode]);

  // Update step progression and explosion when props change
  useEffect(() => {
    if (modelMeshRef.current) {
      modelMeshRef.current.updateStep(currentStep, totalSteps, explodeSlider);
    }
  }, [currentStep, totalSteps, explodeSlider]);

  // Mouse drag Orbit rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !modelMeshRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    modelMeshRef.current.group.rotation.y += deltaX * 0.01;
    modelMeshRef.current.group.rotation.x += deltaY * 0.01;

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetCamera = () => {
    if (modelMeshRef.current) {
      modelMeshRef.current.group.rotation.set(0, 0, 0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#0d171f] overflow-hidden select-none border border-[#233547] rounded-xl shadow-md"
    >
      {/* Top Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
        {/* Step Progress Pill */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white shadow-md">
          <div className="w-5 h-5 rounded-full bg-[#0058a3] text-white flex items-center justify-center font-bold text-xs">
            {currentStep}
          </div>
          <span className="text-xs font-mono font-semibold">
            PASO {currentStep}/{totalSteps}
          </span>
          {stepDescription && (
            <span className="text-xs text-white/70 max-w-[200px] truncate border-l border-white/20 pl-2">
              {stepDescription}
            </span>
          )}
        </div>

        {/* Style Preset Selector */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setStyleMode('blueprint')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              styleMode === 'blueprint'
                ? 'bg-[#00bcd4] text-black font-bold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Plano Blueprint
          </button>
          <button
            onClick={() => setStyleMode('wood')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              styleMode === 'wood'
                ? 'bg-[#d4a373] text-black font-bold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Madera Real
          </button>
          <button
            onClick={() => setStyleMode('manual')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              styleMode === 'manual'
                ? 'bg-white text-black font-bold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Manual B&N
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-white">
        {/* Exploded View Slider */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Sliders size={14} className="text-[#00bcd4]" />
          <span className="text-xs font-semibold whitespace-nowrap">
            Despiece: {Math.round(explodeSlider * 100)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={explodeSlider}
            onChange={(e) => setExplodeSlider(parseFloat(e.target.value))}
            className="w-full accent-[#00bcd4] cursor-pointer"
          />
        </div>

        {/* Orbit / Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              autoRotate ? 'bg-[#00bcd4]/30 text-[#00bcd4]' : 'bg-white/10 text-white/80'
            }`}
            title="Giro automático de cámara"
          >
            <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
            Auto-giro
          </button>
          <button
            onClick={resetCamera}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/90 flex items-center gap-1.5"
            title="Restablecer ángulo isométrico"
          >
            <Compass size={13} />
            Centrar
          </button>
        </div>
      </div>
    </div>
  );
};
