// ============================================================================
// Stage 4 — Interactive 3D Exploded & Assembly Twin Viewport (Three.js)
// Timeline scrubber ↔ PASO sync ↔ collision pulse
// ============================================================================

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  AssemblyGraph,
  CollisionFlag,
  ScannedPrimitive,
} from './spatialTypes.ts';
import { Play, Pause, RotateCcw, Sliders } from 'lucide-react';

export interface AssemblyTwinViewportProps {
  graph: AssemblyGraph;
  explosion: number; // 0..1
  assemblyStep: number; // 0 = nothing, N = through PASO N
  isPlaying?: boolean;
  onExplosionChange: (v: number) => void;
  onAssemblyStepChange: (step: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  collisionFlags?: CollisionFlag[];
  /** Highlighted code line for sync badge */
  activeCodeLine?: number | null;
}

const SCALE = 0.004; // mm → scene units

function boxMesh(p: ScannedPrimitive, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.BoxGeometry(
    Math.max(0.02, p.obb.size.x * SCALE),
    Math.max(0.02, p.obb.size.y * SCALE),
    Math.max(0.02, p.obb.size.z * SCALE)
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    p.obb.center.x * SCALE,
    p.obb.center.y * SCALE,
    p.obb.center.z * SCALE
  );
  mesh.userData.partId = p.id;
  mesh.userData.home = mesh.position.clone();
  mesh.userData.explodeDir = new THREE.Vector3(
    p.explodeNormal.x,
    p.explodeNormal.y,
    p.explodeNormal.z
  ).normalize();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const AssemblyTwinViewport: React.FC<AssemblyTwinViewportProps> = ({
  graph,
  explosion,
  assemblyStep,
  isPlaying = false,
  onExplosionChange,
  onAssemblyStepChange,
  onPlayingChange,
  collisionFlags = [],
  activeCodeLine,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const partsGroupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const rotRef = useRef({ yaw: 0.6, pitch: 0.35 });
  const explosionRef = useRef(explosion);
  const stepRef = useRef(assemblyStep);
  const collisionsRef = useRef(collisionFlags);
  explosionRef.current = explosion;
  stepRef.current = assemblyStep;
  collisionsRef.current = collisionFlags;

  const maxStep = graph.steps.length;
  const activeStepMeta = useMemo(
    () => graph.steps.find((s) => s.stepNumber === assemblyStep),
    [graph.steps, assemblyStep]
  );

  // Build / rebuild scene when graph changes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1620);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / Math.max(height, 1), 0.1, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(8, 14, 6);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x4fc3f7, 0.35);
    fill.position.set(-6, 4, -4);
    scene.add(fill);

    const grid = new THREE.GridHelper(12, 24, 0x00bcd4, 0x1b3a5b);
    scene.add(grid);

    const partsGroup = new THREE.Group();
    partsGroupRef.current = partsGroup;
    scene.add(partsGroup);

    const map = new Map<string, THREE.Mesh>();
    for (const p of graph.primitives) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.materialTone),
        roughness: 0.55,
        metalness: 0.08,
        flatShading: false,
      });
      // Blueprint edge overlay
      const mesh = boxMesh(p, mat);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.7 })
      );
      mesh.add(edges);
      partsGroup.add(mesh);
      map.set(p.id, mesh);
    }
    meshesRef.current = map;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const yaw = rotRef.current.yaw;
      const pitch = rotRef.current.pitch;
      const dist = 9;
      camera.position.set(
        Math.sin(yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist + 2.2,
        Math.cos(yaw) * Math.cos(pitch) * dist
      );
      camera.lookAt(0, 1.6, 0);

      // Explode + assembly visibility
      const exp = explosionRef.current;
      const step = stepRef.current;
      const assembled = new Set<string>();
      for (const s of graph.steps) {
        if (s.stepNumber <= step) s.partIds.forEach((id) => assembled.add(id));
      }

      const colliding = new Set(
        collisionsRef.current
          .filter((c) => c.stepNumber <= Math.max(step, 1))
          .map((c) => c.partId)
      );

      const t = performance.now() * 0.004;
      for (const [id, mesh] of meshesRef.current) {
        const home = mesh.userData.home as THREE.Vector3;
        const dirV = mesh.userData.explodeDir as THREE.Vector3;
        const explodeOffset = dirV.clone().multiplyScalar(exp * 2.8);
        mesh.position.copy(home).add(explodeOffset);

        const visible = step === 0 ? true : assembled.has(id);
        // When assembling forward (step>0) and not exploded, fly-in from floor
        if (step > 0 && exp < 0.05 && !assembled.has(id)) {
          mesh.visible = false;
        } else {
          mesh.visible = step === 0 ? true : visible || exp > 0.05;
        }

        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (colliding.has(id)) {
          mat.color.setHex(0xff3333);
          mat.transparent = true;
          mat.opacity = 0.45 + 0.35 * Math.sin(t);
          mat.emissive = new THREE.Color(0xaa0000);
          mat.emissiveIntensity = 0.4 + 0.3 * Math.sin(t);
        } else {
          const prim = graph.primitives.find((p) => p.id === id);
          mat.color.set(prim?.materialTone || '#cccccc');
          mat.transparent = false;
          mat.opacity = 1;
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
      }

      if (!dragRef.current.active) {
        rotRef.current.yaw += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / Math.max(h, 1);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      map.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
      scene.clear();
    };
  }, [graph]);

  // Playback ticker
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      onAssemblyStepChange(Math.min(maxStep, assemblyStep + 1));
      if (assemblyStep + 1 >= maxStep) onPlayingChange?.(false);
    }, 1100);
    return () => clearInterval(id);
  }, [isPlaying, assemblyStep, maxStep, onAssemblyStepChange, onPlayingChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    rotRef.current.yaw -= dx * 0.008;
    rotRef.current.pitch = Math.max(-0.2, Math.min(1.2, rotRef.current.pitch + dy * 0.006));
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a1620] overflow-hidden">
      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/60 text-cyan-300 border border-cyan-700/40">
            ASSEMBLY TWIN · {graph.furnitureName}
          </span>
          {activeCodeLine != null && (
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#0058a3]/80 text-white">
              Sync editor → línea {activeCodeLine}
            </span>
          )}
          {collisionFlags.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-red-900/80 text-red-100 border border-red-500/50 animate-pulse">
              ACCESO_BLOQUEADO ×{collisionFlags.length}
            </span>
          )}
        </div>
      </div>

      {/* Timeline / explode controls */}
      <div className="shrink-0 border-t border-[#1b3a5b] bg-[#0d1c28] px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-white">
          <Sliders size={14} className="text-[#ffdb00] shrink-0" />
          <span className="text-[10px] font-bold whitespace-nowrap text-cyan-100/90">
            Exploded {Math.round(explosion * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(explosion * 100)}
            onChange={(e) => onExplosionChange(Number(e.target.value) / 100)}
            className="flex-1 accent-[#ffdb00] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onExplosionChange(explosion < 0.1 ? 0.85 : 0)}
            className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 font-semibold"
          >
            {explosion < 0.1 ? 'Explotar' : 'Unir'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={() => {
              onExplosionChange(0);
              onAssemblyStepChange(0);
              onPlayingChange?.(false);
            }}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20"
            title="Reset"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              onExplosionChange(0);
              if (assemblyStep >= maxStep) onAssemblyStepChange(0);
              onPlayingChange?.(!isPlaying);
            }}
            className="p-1.5 rounded bg-[#0058a3] hover:bg-[#006bb3]"
            title="Play / Pause montaje"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="text-[10px] font-bold whitespace-nowrap text-cyan-100/90">
            PASO {assemblyStep}/{maxStep}
          </span>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={assemblyStep}
            onChange={(e) => {
              onPlayingChange?.(false);
              onExplosionChange(0);
              onAssemblyStepChange(Number(e.target.value));
            }}
            className="flex-1 accent-cyan-400 cursor-pointer"
          />
        </div>

        {activeStepMeta && (
          <p className="text-[10px] text-cyan-200/80 font-mono truncate">
            {activeStepMeta.description}
            {activeStepMeta.codeLineStart
              ? ` · .ikea L${activeStepMeta.codeLineStart}–${activeStepMeta.codeLineEnd}`
              : ''}
          </p>
        )}
      </div>
    </div>
  );
};
