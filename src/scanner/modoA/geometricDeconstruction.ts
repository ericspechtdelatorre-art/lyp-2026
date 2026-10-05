// ============================================================================
// Stage 1 — Spatial Segmentation & Geometric Deconstruction
// OBB fitting, ground-plane (Y=0) normalization, primitive classification
// ============================================================================

import {
  ModoAPresetId,
  OrientedBoundingBox,
  PartRole,
  ScannedPrimitive,
  Vec3,
} from './spatialTypes.ts';

const AXIS_X: Vec3 = { x: 1, y: 0, z: 0 };
const AXIS_Y: Vec3 = { x: 0, y: 1, z: 0 };
const AXIS_Z: Vec3 = { x: 0, y: 0, z: 1 };

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function makeObb(center: Vec3, size: Vec3): OrientedBoundingBox {
  return {
    center,
    halfExtents: v(size.x / 2, size.y / 2, size.z / 2),
    axes: [AXIS_X, AXIS_Y, AXIS_Z],
    size,
  };
}

function densityFor(kind: ScannedPrimitive['kind']): number {
  switch (kind) {
    case 'TABLERO':
      return 0.00055; // kg/mm³ proxy (particle board)
    case 'TORNILLO':
      return 0.0078;
    case 'CAJON':
      return 0.0004;
    case 'ENCAJE':
      return 0.0002;
    default:
      return 0.0005;
  }
}

function massFromObb(obb: OrientedBoundingBox, kind: ScannedPrimitive['kind']): number {
  const vol = obb.size.x * obb.size.y * obb.size.z;
  return Math.max(0.05, vol * densityFor(kind));
}

function classifyPrimitive(size: Vec3, role: PartRole): ScannedPrimitive['kind'] {
  if (role === 'drawer') return 'CAJON';
  if (role === 'fastener') return 'ENCAJE';
  if (role === 'leg') {
    // Thin extrusions → TORNILLO count proxy / leg as TABLERO cylinder analog
    const thin = Math.min(size.x, size.z);
    return thin < 80 ? 'TORNILLO' : 'TABLERO';
  }
  // Flat planar → TABLERO
  const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
  if (dims[0] / (dims[2] || 1) < 0.18) return 'TABLERO';
  return 'TABLERO';
}

function explodeNormalFor(role: PartRole, center: Vec3): Vec3 {
  switch (role) {
    case 'leg':
      return v(center.x >= 0 ? 0.4 : -0.4, -0.85, center.z >= 0 ? 0.4 : -0.4);
    case 'top':
      return v(0, 1, 0);
    case 'bottom':
      return v(0, -1, 0);
    case 'shelf':
      return v(0, 0.6, 0.2);
    case 'side':
      return v(center.x >= 0 ? 1 : -1, 0.1, 0);
    case 'back':
      return v(0, 0.1, -1);
    case 'drawer':
      return v(0, 0, 1);
    default:
      return v(center.x * 0.01, 0.5, center.z * 0.01);
  }
}

function prim(
  id: string,
  name: string,
  role: PartRole,
  center: Vec3,
  size: Vec3,
  tone: string,
  confidence: number,
  screen: ScannedPrimitive['screenBBox']
): ScannedPrimitive {
  const kind = classifyPrimitive(size, role);
  const obb = makeObb(center, size);
  // Lift so lowest point sits on Y=0 if it's a ground contact candidate
  return {
    id,
    name,
    kind,
    role,
    obb,
    materialTone: tone,
    confidence,
    screenBBox: screen,
    massKg: massFromObb(obb, kind),
    explodeNormal: explodeNormalFor(role, center),
  };
}

/** Normalize so minimum Y of all OBBs is 0 (ground plane via RANSAC proxy). */
export function normalizeToGroundPlane(parts: ScannedPrimitive[]): ScannedPrimitive[] {
  let minY = Infinity;
  for (const p of parts) {
    const bottom = p.obb.center.y - p.obb.halfExtents.y;
    if (bottom < minY) minY = bottom;
  }
  const dy = -minY;
  return parts.map((p) => ({
    ...p,
    obb: {
      ...p.obb,
      center: { ...p.obb.center, y: p.obb.center.y + dy },
    },
  }));
}

export function deconstructPreset(preset: ModoAPresetId): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  switch (preset) {
    case 'lack':
      return {
        furnitureName: 'MesaLackEscaneada',
        primitives: normalizeToGroundPlane([
          prim('lack-top', 'Tablero_Principal_55x55', 'top', v(0, 475, 0), v(550, 50, 550), '#d4a373', 0.97, {
            x: 0.12, y: 0.12, width: 0.76, height: 0.14,
          }),
          prim('lack-leg-fl', 'Pata_FL', 'leg', v(-225, 225, 225), v(50, 450, 50), '#8b6914', 0.94, {
            x: 0.14, y: 0.28, width: 0.1, height: 0.58,
          }),
          prim('lack-leg-fr', 'Pata_FR', 'leg', v(225, 225, 225), v(50, 450, 50), '#8b6914', 0.93, {
            x: 0.76, y: 0.28, width: 0.1, height: 0.58,
          }),
          prim('lack-leg-bl', 'Pata_BL', 'leg', v(-225, 225, -225), v(50, 450, 50), '#8b6914', 0.92, {
            x: 0.18, y: 0.3, width: 0.08, height: 0.52,
          }),
          prim('lack-leg-br', 'Pata_BR', 'leg', v(225, 225, -225), v(50, 450, 50), '#8b6914', 0.91, {
            x: 0.74, y: 0.3, width: 0.08, height: 0.52,
          }),
        ]),
      };
    case 'kallax':
      return {
        furnitureName: 'EstanteriaKallaxEscaneada',
        primitives: normalizeToGroundPlane([
          prim('kx-bottom', 'Panel_Inferior', 'bottom', v(0, 9, 0), v(770, 18, 390), '#e8dcc8', 0.96, {
            x: 0.15, y: 0.72, width: 0.7, height: 0.08,
          }),
          prim('kx-top', 'Panel_Superior', 'top', v(0, 761, 0), v(770, 18, 390), '#e8dcc8', 0.95, {
            x: 0.15, y: 0.1, width: 0.7, height: 0.08,
          }),
          prim('kx-left', 'Lateral_Izq', 'side', v(-376, 385, 0), v(18, 770, 390), '#d4c4a8', 0.94, {
            x: 0.12, y: 0.18, width: 0.08, height: 0.55,
          }),
          prim('kx-right', 'Lateral_Der', 'side', v(376, 385, 0), v(18, 770, 390), '#d4c4a8', 0.94, {
            x: 0.8, y: 0.18, width: 0.08, height: 0.55,
          }),
          prim('kx-mid-h', 'Divisor_Horizontal', 'shelf', v(0, 385, 0), v(740, 16, 370), '#cbb892', 0.9, {
            x: 0.22, y: 0.42, width: 0.56, height: 0.06,
          }),
          prim('kx-mid-v', 'Divisor_Vertical', 'frame', v(0, 385, 0), v(16, 740, 370), '#cbb892', 0.89, {
            x: 0.46, y: 0.2, width: 0.08, height: 0.5,
          }),
          prim('kx-back', 'Panel_Trasero', 'back', v(0, 385, -188), v(750, 750, 6), '#b8a888', 0.88, {
            x: 0.2, y: 0.18, width: 0.6, height: 0.52,
          }),
        ]),
      };
    case 'alex':
      return {
        furnitureName: 'CajoneraAlexEscaneada',
        primitives: normalizeToGroundPlane([
          prim('ax-chassis', 'Chasis_Alex', 'frame', v(0, 350, 0), v(360, 700, 480), '#f5f5f0', 0.95, {
            x: 0.25, y: 0.15, width: 0.5, height: 0.7,
          }),
          prim('ax-d1', 'Cajon_1', 'drawer', v(0, 120, 40), v(320, 110, 400), '#e0ddd4', 0.93, {
            x: 0.28, y: 0.68, width: 0.44, height: 0.1,
          }),
          prim('ax-d2', 'Cajon_2', 'drawer', v(0, 250, 40), v(320, 110, 400), '#e0ddd4', 0.92, {
            x: 0.28, y: 0.55, width: 0.44, height: 0.1,
          }),
          prim('ax-d3', 'Cajon_3', 'drawer', v(0, 380, 40), v(320, 110, 400), '#e0ddd4', 0.91, {
            x: 0.28, y: 0.42, width: 0.44, height: 0.1,
          }),
          prim('ax-d4', 'Cajon_4', 'drawer', v(0, 510, 40), v(320, 110, 400), '#e0ddd4', 0.9, {
            x: 0.28, y: 0.29, width: 0.44, height: 0.1,
          }),
          prim('ax-d5', 'Cajon_5', 'drawer', v(0, 640, 40), v(320, 110, 400), '#e0ddd4', 0.89, {
            x: 0.28, y: 0.16, width: 0.44, height: 0.1,
          }),
        ]),
      };
    case 'chair':
      return {
        furnitureName: 'SillaEscaneada',
        primitives: normalizeToGroundPlane([
          prim('ch-seat', 'Asiento', 'top', v(0, 450, 0), v(420, 30, 400), '#c4a574', 0.96, {
            x: 0.2, y: 0.4, width: 0.6, height: 0.12,
          }),
          prim('ch-back', 'Respaldo', 'back', v(0, 700, -180), v(420, 480, 25), '#b8956a', 0.94, {
            x: 0.22, y: 0.08, width: 0.56, height: 0.32,
          }),
          prim('ch-leg-fl', 'Pata_FL', 'leg', v(-170, 225, 150), v(35, 450, 35), '#8b6914', 0.93, {
            x: 0.18, y: 0.52, width: 0.08, height: 0.4,
          }),
          prim('ch-leg-fr', 'Pata_FR', 'leg', v(170, 225, 150), v(35, 450, 35), '#8b6914', 0.93, {
            x: 0.74, y: 0.52, width: 0.08, height: 0.4,
          }),
          prim('ch-leg-bl', 'Pata_BL', 'leg', v(-170, 225, -150), v(35, 450, 35), '#8b6914', 0.92, {
            x: 0.22, y: 0.52, width: 0.07, height: 0.38,
          }),
          prim('ch-leg-br', 'Pata_BR', 'leg', v(170, 225, -150), v(35, 450, 35), '#8b6914', 0.92, {
            x: 0.71, y: 0.52, width: 0.07, height: 0.38,
          }),
        ]),
      };
    case 'billy':
    default:
      return {
        furnitureName: 'EstanteriaBillyEscaneada',
        primitives: normalizeToGroundPlane([
          prim('by-left', 'Lateral_Izq', 'side', v(-390, 1000, 0), v(18, 2000, 280), '#f0ebe3', 0.94, {
            x: 0.15, y: 0.05, width: 0.08, height: 0.85,
          }),
          prim('by-right', 'Lateral_Der', 'side', v(390, 1000, 0), v(18, 2000, 280), '#f0ebe3', 0.94, {
            x: 0.77, y: 0.05, width: 0.08, height: 0.85,
          }),
          prim('by-top', 'Techo', 'top', v(0, 1991, 0), v(800, 18, 280), '#f0ebe3', 0.93, {
            x: 0.2, y: 0.04, width: 0.6, height: 0.05,
          }),
          prim('by-bot', 'Suelo', 'bottom', v(0, 9, 0), v(800, 18, 280), '#f0ebe3', 0.93, {
            x: 0.2, y: 0.88, width: 0.6, height: 0.05,
          }),
          prim('by-s1', 'Balda_1', 'shelf', v(0, 500, 0), v(760, 16, 260), '#e8e0d4', 0.9, {
            x: 0.22, y: 0.65, width: 0.56, height: 0.04,
          }),
          prim('by-s2', 'Balda_2', 'shelf', v(0, 1000, 0), v(760, 16, 260), '#e8e0d4', 0.9, {
            x: 0.22, y: 0.45, width: 0.56, height: 0.04,
          }),
          prim('by-s3', 'Balda_3', 'shelf', v(0, 1500, 0), v(760, 16, 260), '#e8e0d4', 0.89, {
            x: 0.22, y: 0.25, width: 0.56, height: 0.04,
          }),
        ]),
      };
  }
}

const GENERIC_FURNITURE_NAME = 'MuebleEscaneado';

type SilhouetteMetrics = {
  aspect: number;
  fill: number;
  upperMass: number;
  lowerMass: number;
  hPeaks: number;
  bbox: { x: number; y: number; w: number; h: number };
};

function analyzeSilhouette(canvas: HTMLCanvasElement): SilhouetteMetrics {
  const w = canvas.width || 1;
  const h = canvas.height || 1;
  const ctx = canvas.getContext('2d');
  const fallback: SilhouetteMetrics = {
    aspect: w / h,
    fill: 0.45,
    upperMass: 0.5,
    lowerMass: 0.5,
    hPeaks: 2,
    bbox: { x: 0.15, y: 0.1, w: 0.7, h: 0.8 },
  };
  if (!ctx) return fallback;

  const tw = 120;
  const th = Math.max(40, Math.round((h / w) * tw));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext('2d');
  if (!tctx) return fallback;
  tctx.drawImage(canvas, 0, 0, tw, th);

  let data: ImageData;
  try {
    data = tctx.getImageData(0, 0, tw, th);
  } catch {
    return fallback;
  }

  const lum = (i: number) =>
    (data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114) / 255;

  const corners = [
    lum(0),
    lum((tw - 1) * 4),
    lum((th - 1) * tw * 4),
    lum(((th - 1) * tw + tw - 1) * 4),
  ];
  const bg = corners.reduce((a, b) => a + b, 0) / corners.length;

  const mask: boolean[] = [];
  let minX = tw;
  let minY = th;
  let maxX = 0;
  let maxY = 0;
  let fg = 0;
  let upper = 0;
  let lower = 0;

  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      const isFg = Math.abs(lum(i) - bg) > 0.12;
      mask.push(isFg);
      if (isFg) {
        fg++;
        if (y < th / 2) upper++;
        else lower++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (fg < tw * th * 0.02) {
    return fallback;
  }

  const rowEdge = new Array(th).fill(0);
  for (let y = 1; y < th - 1; y++) {
    for (let x = 0; x < tw; x++) {
      const a = mask[y * tw + x];
      const b = mask[(y - 1) * tw + x];
      const c = mask[(y + 1) * tw + x];
      if (a !== b || a !== c) rowEdge[y]++;
    }
  }
  let hPeaks = 0;
  for (let y = 2; y < th - 2; y++) {
    if (rowEdge[y] > tw * 0.08 && rowEdge[y] > rowEdge[y - 1] && rowEdge[y] >= rowEdge[y + 1]) {
      hPeaks++;
    }
  }
  hPeaks = Math.min(5, Math.max(1, Math.floor(hPeaks / 3)));

  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);

  return {
    aspect: bw / bh,
    fill: fg / (tw * th),
    upperMass: upper / Math.max(1, fg),
    lowerMass: lower / Math.max(1, fg),
    hPeaks,
    bbox: {
      x: minX / tw,
      y: minY / th,
      w: bw / tw,
      h: bh / th,
    },
  };
}

/**
 * Universal deconstruction: same pipeline for any furniture photo (no preset catalog).
 */
export function deconstructGenericFromMetrics(m: SilhouetteMetrics): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  const parts: ScannedPrimitive[] = [];
  const tones = ['#d4a373', '#c4b896', '#b8956a', '#8b6914', '#e8dcc8', '#cbb892'];
  let idx = 0;
  const tone = () => tones[idx++ % tones.length];

  const spanW = Math.round(400 + m.fill * 500 + m.bbox.w * 400);
  const spanH = Math.round(350 + m.bbox.h * 1200);
  const depth = Math.round(280 + m.fill * 180);

  const sb = m.bbox;

  // Base panel (always)
  parts.push(
    prim(
      `gen-base`,
      'Panel_Inferior',
      'bottom',
      v(0, 9, 0),
      v(spanW, 18, depth),
      tone(),
      0.88,
      { x: sb.x, y: sb.y + sb.h * 0.85, width: sb.w, height: sb.h * 0.08 }
    )
  );

  const isWide = m.aspect > 1.15;
  const isTall = m.aspect < 0.85;

  if (isWide) {
    const topY = Math.round(spanH * 0.85);
    parts.push(
      prim(
        'gen-top',
        'Tablero_Superior',
        'top',
        v(0, topY, 0),
        v(spanW, Math.max(25, Math.round(spanH * 0.06)), spanW * 0.95),
        tone(),
        0.9,
        { x: sb.x, y: sb.y, width: sb.w, height: sb.h * 0.12 }
      )
    );
    const legH = Math.round(spanH * 0.75);
    const lx = spanW * 0.42;
    const lz = depth * 0.42;
    const corners: [string, number, number][] = [
      ['FL', -lx, lz],
      ['FR', lx, lz],
      ['BL', -lx, -lz],
      ['BR', lx, -lz],
    ];
    for (const [tag, px, pz] of corners) {
      parts.push(
        prim(
          `gen-leg-${tag}`,
          `Pata_${tag}`,
          'leg',
          v(px, legH / 2, pz),
          v(45, legH, 45),
          tone(),
          0.86,
          {
            x: sb.x + (tag.includes('R') ? sb.w * 0.7 : sb.w * 0.05),
            y: sb.y + sb.h * 0.25,
            width: sb.w * 0.12,
            height: sb.h * 0.55,
          }
        )
      );
    }
  } else if (isTall) {
    const h = spanH;
    parts.push(
      prim('gen-left', 'Lateral_Izq', 'side', v(-spanW / 2 + 9, h / 2, 0), v(18, h, depth), tone(), 0.89, {
        x: sb.x,
        y: sb.y,
        width: sb.w * 0.12,
        height: sb.h,
      }),
      prim('gen-right', 'Lateral_Der', 'side', v(spanW / 2 - 9, h / 2, 0), v(18, h, depth), tone(), 0.89, {
        x: sb.x + sb.w * 0.88,
        y: sb.y,
        width: sb.w * 0.12,
        height: sb.h,
      }),
      prim('gen-top', 'Panel_Superior', 'top', v(0, h - 9, 0), v(spanW - 36, 18, depth), tone(), 0.87, {
        x: sb.x,
        y: sb.y,
        width: sb.w,
        height: sb.h * 0.06,
      }),
      prim('gen-back', 'Panel_Trasero', 'back', v(0, h / 2, -depth / 2 + 3), v(spanW - 40, h - 36, 6), tone(), 0.85, {
        x: sb.x + sb.w * 0.1,
        y: sb.y + sb.h * 0.1,
        width: sb.w * 0.8,
        height: sb.h * 0.75,
      })
    );
    for (let s = 1; s <= m.hPeaks; s++) {
      const y = Math.round((h * s) / (m.hPeaks + 1));
      parts.push(
        prim(
          `gen-shelf-${s}`,
          `Balda_${s}`,
          'shelf',
          v(0, y, 0),
          v(spanW - 48, 16, depth - 24),
          tone(),
          0.84,
          {
            x: sb.x + sb.w * 0.1,
            y: sb.y + sb.h * (1 - s / (m.hPeaks + 1)),
            width: sb.w * 0.8,
            height: sb.h * 0.05,
          }
        )
      );
    }
  } else {
    const h = Math.round(spanH * 0.85);
    parts.push(
      prim('gen-left', 'Lateral_Izq', 'side', v(-spanW / 2 + 9, h / 2, 0), v(18, h, depth), tone(), 0.88, {
        x: sb.x,
        y: sb.y + sb.h * 0.1,
        width: sb.w * 0.1,
        height: sb.h * 0.8,
      }),
      prim('gen-right', 'Lateral_Der', 'side', v(spanW / 2 - 9, h / 2, 0), v(18, h, depth), tone(), 0.88, {
        x: sb.x + sb.w * 0.9,
        y: sb.y + sb.h * 0.1,
        width: sb.w * 0.1,
        height: sb.h * 0.8,
      }),
      prim('gen-top', 'Panel_Superior', 'top', v(0, h - 9, 0), v(spanW - 36, 18, depth), tone(), 0.87, {
        x: sb.x,
        y: sb.y,
        width: sb.w,
        height: sb.h * 0.08,
      }),
      prim('gen-mid-h', 'Divisor_Horizontal', 'shelf', v(0, h / 2, 0), v(spanW - 48, 16, depth - 20), tone(), 0.86, {
        x: sb.x + sb.w * 0.15,
        y: sb.y + sb.h * 0.45,
        width: sb.w * 0.7,
        height: sb.h * 0.06,
      }),
      prim('gen-mid-v', 'Divisor_Vertical', 'frame', v(0, h / 2, 0), v(16, h - 40, depth - 20), tone(), 0.85, {
        x: sb.x + sb.w * 0.45,
        y: sb.y + sb.h * 0.15,
        width: sb.w * 0.1,
        height: sb.h * 0.7,
      })
    );
    if (m.upperMass > 0.55) {
      parts.push(
        prim('gen-drawer', 'Modulo_Cajon', 'drawer', v(0, h * 0.35, depth * 0.15), v(spanW * 0.55, 110, depth * 0.75), tone(), 0.82, {
          x: sb.x + sb.w * 0.22,
          y: sb.y + sb.h * 0.35,
          width: sb.w * 0.56,
          height: sb.h * 0.18,
        })
      );
    }
  }

  return {
    furnitureName: GENERIC_FURNITURE_NAME,
    primitives: normalizeToGroundPlane(parts),
  };
}

export function deconstructFromCanvas(canvas: HTMLCanvasElement): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  const metrics = analyzeSilhouette(canvas);
  return deconstructGenericFromMetrics(metrics);
}

/** Neutral canvas for first paint (same generic path as any capture). */
export function deconstructGenericPlaceholder(): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  if (typeof document === 'undefined') {
    return deconstructGenericFromMetrics({
      aspect: 1,
      fill: 0.5,
      upperMass: 0.5,
      lowerMass: 0.5,
      hPeaks: 2,
      bbox: { x: 0.2, y: 0.15, w: 0.6, h: 0.7 },
    });
  }
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 480;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#aeb4bc';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#6d5844';
    ctx.fillRect(120, 80, 400, 340);
  }
  return deconstructFromCanvas(c);
}

/** AABB distance between two OBBs (axis-aligned approximation). */
export function aabbGap(a: OrientedBoundingBox, b: OrientedBoundingBox): number {
  const dx = Math.abs(a.center.x - b.center.x) - (a.halfExtents.x + b.halfExtents.x);
  const dy = Math.abs(a.center.y - b.center.y) - (a.halfExtents.y + b.halfExtents.y);
  const dz = Math.abs(a.center.z - b.center.z) - (a.halfExtents.z + b.halfExtents.z);
  return Math.max(dx, dy, dz);
}
