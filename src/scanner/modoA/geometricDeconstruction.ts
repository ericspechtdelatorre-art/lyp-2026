// ============================================================================
// Stage 1 — Spatial Segmentation & Geometric Deconstruction
// OBB fitting, ground-plane (Y=0) normalization, primitive classification
// ============================================================================

import {
  ModoAPresetId,
  OrientedBoundingBox,
  PartRole,
  ScanViewId,
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
const OPEN_SHELF_NAME = 'EstanteriaAbiertaEscaneada';

export type FurnitureTopology =
  | 'open_shelf'
  | 'closed_cabinet'
  | 'table'
  | 'modular'
  | 'unknown';

type SilhouetteMetrics = {
  aspect: number;
  fill: number;
  upperMass: number;
  lowerMass: number;
  /** Number of interior horizontal shelves detected (excluding top/bottom) */
  hPeaks: number;
  /** Absolute Y positions of shelf bands in bbox-normalized 0..1 (top=0) */
  shelfBands: number[];
  bbox: { x: number; y: number; w: number; h: number };
  topology: FurnitureTopology;
  woodTone: string;
  openFront: boolean;
  sidePanelStrength: number;
  /** Fused physical extents in mm (set by multi-view fusion) */
  dimsMm?: { width: number; height: number; depth: number };
};

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function isWoodLike(r: number, g: number, b: number): boolean {
  // Light unfinished plywood / MDF: warm, moderately bright, low saturation green channel lag
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const warm = r > g - 8 && g >= b - 15;
  const notSkinHeavy = !(r > 180 && g > 120 && g < 170 && b < 140 && lum > 0.45 && lum < 0.75);
  const notGreenVine = !(g > r + 25 && g > b + 15);
  const notBrick = !(r > 120 && r > g + 40 && r > b + 40 && lum < 0.55);
  const notBlackClothes = lum > 0.28;
  const notWhiteGrid = lum < 0.92 || max - min > 18;
  return warm && notSkinHeavy && notGreenVine && notBrick && notBlackClothes && notWhiteGrid && lum > 0.32 && lum < 0.9;
}

function analyzeSilhouette(canvas: HTMLCanvasElement): SilhouetteMetrics {
  const w = canvas.width || 1;
  const h = canvas.height || 1;
  const ctx = canvas.getContext('2d');
  const fallback: SilhouetteMetrics = {
    aspect: 0.7,
    fill: 0.12,
    upperMass: 0.45,
    lowerMass: 0.55,
    hPeaks: 1,
    shelfBands: [0.5],
    bbox: { x: 0.35, y: 0.25, w: 0.3, h: 0.45 },
    topology: 'open_shelf',
    woodTone: '#d4a373',
    openFront: true,
    sidePanelStrength: 0.7,
  };
  if (!ctx) return fallback;

  const tw = 160;
  const th = Math.max(60, Math.round((h / w) * tw));
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

  const woodMask: boolean[] = new Array(tw * th).fill(false);
  let minX = tw;
  let minY = th;
  let maxX = 0;
  let maxY = 0;
  let woodCount = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      if (isWoodLike(r, g, b)) {
        woodMask[y * tw + x] = true;
        woodCount++;
        sumR += r;
        sumG += g;
        sumB += b;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If wood mask too sparse, fall back to contrast blob vs border median
  if (woodCount < tw * th * 0.008) {
    const lum = (x: number, y: number) => {
      const i = (y * tw + x) * 4;
      return (data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114) / 255;
    };
    const border: number[] = [];
    for (let x = 0; x < tw; x++) {
      border.push(lum(x, 0), lum(x, th - 1));
    }
    for (let y = 0; y < th; y++) {
      border.push(lum(0, y), lum(tw - 1, y));
    }
    border.sort((a, b) => a - b);
    const bg = border[Math.floor(border.length / 2)];
    minX = tw;
    minY = th;
    maxX = 0;
    maxY = 0;
    woodCount = 0;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const d = Math.abs(lum(x, y) - bg);
        if (d > 0.18) {
          woodMask[y * tw + x] = true;
          woodCount++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }

  if (woodCount < 20 || maxX <= minX || maxY <= minY) {
    return fallback;
  }

  // Shrink bbox to densest wood column band (reject arms/people around shelf)
  const colDensity = new Array(tw).fill(0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (woodMask[y * tw + x]) colDensity[x]++;
    }
  }
  const colH = maxY - minY + 1;
  let c0 = minX;
  let c1 = maxX;
  while (c0 < c1 && colDensity[c0] < colH * 0.12) c0++;
  while (c1 > c0 && colDensity[c1] < colH * 0.12) c1--;
  // Prefer contiguous high-density core for small handheld shelves
  let bestL = c0;
  let bestR = c1;
  let bestScore = -1;
  const win = Math.max(8, Math.round((c1 - c0 + 1) * 0.35));
  for (let left = c0; left <= c1 - win; left++) {
    let score = 0;
    for (let x = left; x < left + win; x++) score += colDensity[x];
    if (score > bestScore) {
      bestScore = score;
      bestL = left;
      bestR = left + win - 1;
    }
  }
  // Expand a bit around densest window while density holds
  while (bestL > c0 && colDensity[bestL - 1] > colH * 0.15) bestL--;
  while (bestR < c1 && colDensity[bestR + 1] > colH * 0.15) bestR++;

  minX = bestL;
  maxX = bestR;

  const rowDensity = new Array(th).fill(0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (woodMask[y * tw + x]) rowDensity[y]++;
    }
  }
  const rowW = maxX - minX + 1;
  while (minY < maxY && rowDensity[minY] < rowW * 0.1) minY++;
  while (maxY > minY && rowDensity[maxY] < rowW * 0.1) maxY--;

  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  const aspect = bw / bh;

  // Horizontal shelf bands: rows with high wood density (planks) vs hollow cavities
  const bandScores: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    let solid = 0;
    for (let x = minX; x <= maxX; x++) {
      if (woodMask[y * tw + x]) solid++;
    }
    bandScores.push(solid / bw);
  }

  const peaks: number[] = [];
  for (let i = 2; i < bandScores.length - 2; i++) {
    const s = bandScores[i];
    if (
      s > 0.45 &&
      s >= bandScores[i - 1] &&
      s >= bandScores[i + 1] &&
      s >= bandScores[i - 2] &&
      s >= bandScores[i + 2]
    ) {
      const absY = minY + i;
      const norm = (absY - minY) / bh;
      // merge nearby peaks
      if (peaks.length === 0 || Math.abs(peaks[peaks.length - 1] - norm) > 0.08) {
        peaks.push(norm);
      }
    }
  }

  // Side panel strength: vertical edges of bbox should be denser than center cavities
  let leftEdge = 0;
  let rightEdge = 0;
  let centerHollow = 0;
  const midX0 = Math.floor(minX + bw * 0.35);
  const midX1 = Math.floor(minX + bw * 0.65);
  for (let y = minY; y <= maxY; y++) {
    if (woodMask[y * tw + minX] || woodMask[y * tw + Math.min(maxX, minX + 1)]) leftEdge++;
    if (woodMask[y * tw + maxX] || woodMask[y * tw + Math.max(minX, maxX - 1)]) rightEdge++;
    let hollow = 0;
    for (let x = midX0; x <= midX1; x++) {
      if (!woodMask[y * tw + x]) hollow++;
    }
    centerHollow += hollow / Math.max(1, midX1 - midX0 + 1);
  }
  const sidePanelStrength =
    (leftEdge / bh + rightEdge / bh) / 2;
  const openFront = centerHollow / bh > 0.35;

  // Classify topology
  let topology: FurnitureTopology = 'unknown';
  const interiorShelves = peaks.filter((p) => p > 0.12 && p < 0.88);
  if (aspect < 1.05 && sidePanelStrength > 0.35 && (interiorShelves.length >= 1 || openFront)) {
    topology = 'open_shelf';
  } else if (aspect > 1.2) {
    topology = 'table';
  } else if (!openFront && aspect < 0.9) {
    topology = 'closed_cabinet';
  } else if (aspect >= 0.85 && aspect <= 1.15) {
    topology = 'modular';
  } else {
    topology = openFront ? 'open_shelf' : 'unknown';
  }

  // Force open shelf when we clearly see 2+ plank bands + sides (handheld bookshelf demo)
  if (peaks.length >= 2 && sidePanelStrength > 0.3 && aspect < 1.2) {
    topology = 'open_shelf';
  }

  let hPeaks = interiorShelves.length;
  if (topology === 'open_shelf') {
    // Typical small open shelf: base + mid + top → 1 interior shelf if 3 bands, else use peaks
    if (peaks.length >= 3) hPeaks = Math.max(1, peaks.length - 2);
    else if (peaks.length === 2) hPeaks = 1;
    else hPeaks = Math.max(1, hPeaks);
    hPeaks = Math.min(4, hPeaks);
  }

  const woodTone =
    woodCount > 0
      ? rgbToHex(sumR / woodCount, sumG / woodCount, sumB / woodCount)
      : '#d4a373';

  let upper = 0;
  let lower = 0;
  let fg = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!woodMask[y * tw + x]) continue;
      fg++;
      if (y < minY + bh / 2) upper++;
      else lower++;
    }
  }

  return {
    aspect,
    fill: woodCount / (tw * th),
    upperMass: upper / Math.max(1, fg),
    lowerMass: lower / Math.max(1, fg),
    hPeaks,
    shelfBands: peaks.length ? peaks : [0.12, 0.5, 0.88],
    bbox: {
      x: minX / tw,
      y: minY / th,
      w: bw / tw,
      h: bh / th,
    },
    topology,
    woodTone,
    openFront,
    sidePanelStrength,
  };
}

function buildOpenShelf(m: SilhouetteMetrics): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  const parts: ScannedPrimitive[] = [];
  const wood = m.woodTone || '#d4a373';
  const woodDark = '#b8956a';
  const sb = m.bbox;

  // Compact handheld open bookshelf proportions (~mm)
  // Prefer fused multi-view dims when available
  const spanW = m.dimsMm?.width ?? Math.round(280 + m.bbox.w * 220);
  const spanH = m.dimsMm?.height ?? Math.round(320 + m.bbox.h * 280);
  const depth = m.dimsMm?.depth ?? Math.round(140 + m.bbox.w * 80);
  const boardT = 12;
  const sideT = 14;

  const bands = [...m.shelfBands].sort((a, b) => a - b);
  // Ensure top / mid / bottom
  let levels: number[];
  if (bands.length >= 3) {
    levels = [bands[0], ...bands.slice(1, -1).slice(0, m.hPeaks), bands[bands.length - 1]];
  } else if (bands.length === 2) {
    levels = [0.08, (bands[0] + bands[1]) / 2, 0.92];
  } else {
    // Classic 3-tier: top, middle, bottom
    levels = [0.08, 0.5, 0.92];
  }
  // Deduplicate and clamp to 3–4 horizontal boards for this class
  levels = levels.filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]) > 0.1);
  if (levels.length < 3) levels = [0.08, 0.5, 0.92];
  if (levels.length > 4) {
    levels = [levels[0], levels[Math.floor(levels.length / 2)], levels[levels.length - 1]];
  }

  const yFromNorm = (norm: number) => Math.round(spanH * (1 - norm));

  // Bottom
  const yBot = boardT / 2;
  parts.push(
    prim('shelf-bottom', 'Base_Inferior', 'bottom', v(0, yBot, 0), v(spanW, boardT, depth), wood, 0.93, {
      x: sb.x,
      y: sb.y + sb.h * 0.88,
      width: sb.w,
      height: sb.h * 0.1,
    })
  );

  // Top
  const yTop = spanH - boardT / 2;
  parts.push(
    prim('shelf-top', 'Tablero_Superior', 'top', v(0, yTop, 0), v(spanW, boardT, depth), wood, 0.94, {
      x: sb.x,
      y: sb.y,
      width: sb.w,
      height: sb.h * 0.1,
    })
  );

  // Interior shelves (skip first/last if they map to top/bottom)
  const interior = levels.filter((n) => n > 0.18 && n < 0.82);
  const shelfNorms = interior.length ? interior : [0.5];
  shelfNorms.forEach((norm, i) => {
    const y = Math.max(boardT * 2, Math.min(spanH - boardT * 2, yFromNorm(norm)));
    parts.push(
      prim(
        `shelf-mid-${i + 1}`,
        shelfNorms.length === 1 ? 'Balda_Central' : `Balda_${i + 1}`,
        'shelf',
        v(0, y, 0),
        v(spanW - sideT * 2 - 4, boardT, depth - 8),
        woodDark,
        0.91,
        {
          x: sb.x + sb.w * 0.12,
          y: sb.y + sb.h * norm - sb.h * 0.03,
          width: sb.w * 0.76,
          height: sb.h * 0.06,
        }
      )
    );
  });

  // Side panels — full height open rack (no back panel)
  parts.push(
    prim(
      'shelf-left',
      'Lateral_Izq',
      'side',
      v(-spanW / 2 + sideT / 2, spanH / 2, 0),
      v(sideT, spanH, depth),
      wood,
      0.92,
      { x: sb.x, y: sb.y, width: sb.w * 0.12, height: sb.h }
    ),
    prim(
      'shelf-right',
      'Lateral_Der',
      'side',
      v(spanW / 2 - sideT / 2, spanH / 2, 0),
      v(sideT, spanH, depth),
      wood,
      0.92,
      { x: sb.x + sb.w * 0.88, y: sb.y, width: sb.w * 0.12, height: sb.h }
    )
  );

  return {
    furnitureName: OPEN_SHELF_NAME,
    primitives: normalizeToGroundPlane(parts),
  };
}

/**
 * Universal deconstruction: topology-aware pipeline (open shelf, table, cabinet…).
 */
export function deconstructGenericFromMetrics(m: SilhouetteMetrics): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  if (m.topology === 'open_shelf') {
    return buildOpenShelf(m);
  }

  const parts: ScannedPrimitive[] = [];
  const tones = [m.woodTone || '#d4a373', '#c4b896', '#b8956a', '#8b6914', '#e8dcc8', '#cbb892'];
  let idx = 0;
  const tone = () => tones[idx++ % tones.length];

  const spanW = m.dimsMm?.width ?? Math.round(400 + m.fill * 500 + m.bbox.w * 400);
  const spanH = m.dimsMm?.height ?? Math.round(350 + m.bbox.h * 1200);
  const depth = m.dimsMm?.depth ?? Math.round(280 + m.fill * 180);
  const sb = m.bbox;

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

  const isWide = m.topology === 'table' || m.aspect > 1.15;
  const isTall = m.topology === 'closed_cabinet' || m.aspect < 0.85;

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
    for (let s = 1; s <= Math.max(1, m.hPeaks); s++) {
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
    // modular fallback without vertical divider when openFront
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
      prim('gen-mid-h', 'Balda_Central', 'shelf', v(0, h / 2, 0), v(spanW - 48, 16, depth - 20), tone(), 0.86, {
        x: sb.x + sb.w * 0.15,
        y: sb.y + sb.h * 0.45,
        width: sb.w * 0.7,
        height: sb.h * 0.06,
      })
    );
    if (!m.openFront) {
      parts.push(
        prim('gen-mid-v', 'Divisor_Vertical', 'frame', v(0, h / 2, 0), v(16, h - 40, depth - 20), tone(), 0.85, {
          x: sb.x + sb.w * 0.45,
          y: sb.y + sb.h * 0.15,
          width: sb.w * 0.1,
          height: sb.h * 0.7,
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

export interface MultiViewCapture {
  id: ScanViewId;
  canvas: HTMLCanvasElement;
}

/**
 * Fuse front / side / top silhouettes into one metric set with real depth.
 * Front → height, width, shelves; Side → depth; Top → footprint confirmation.
 */
export function fuseMultiViewMetrics(views: MultiViewCapture[]): SilhouetteMetrics {
  const byId = new Map(views.map((v) => [v.id, analyzeSilhouette(v.canvas)]));
  const front = byId.get('front');
  const side = byId.get('side');
  const top = byId.get('top');
  const primary = front || side || top || analyzeSilhouette(views[0].canvas);

  const REF_PX = 0.35; // bbox fraction that maps to ~reference furniture size
  const frontWmm = front ? Math.round(260 + (front.bbox.w / REF_PX) * 100) : undefined;
  const frontHmm = front ? Math.round(300 + (front.bbox.h / REF_PX) * 120) : undefined;
  // Side view: horizontal extent ≈ depth, vertical ≈ height
  const sideDmm = side ? Math.round(120 + (side.bbox.w / REF_PX) * 90) : undefined;
  const sideHmm = side ? Math.round(300 + (side.bbox.h / REF_PX) * 120) : undefined;
  // Top view: axes ≈ width × depth
  const topWmm = top ? Math.round(260 + (top.bbox.w / REF_PX) * 100) : undefined;
  const topDmm = top ? Math.round(120 + (top.bbox.h / REF_PX) * 90) : undefined;

  const width = Math.round(
    Math.max(frontWmm || 0, topWmm || 0, 280) || 320
  );
  const height = Math.round(
    ((frontHmm || 0) + (sideHmm || 0)) / (frontHmm && sideHmm ? 2 : 1) || frontHmm || sideHmm || 380
  );
  const depth = Math.round(
    Math.max(sideDmm || 0, topDmm || 0, 130) || 160
  );

  const shelfSource = front || primary;
  const topologies = [front, side, top].filter(Boolean).map((m) => m!.topology);
  const topology: FurnitureTopology = topologies.includes('open_shelf')
    ? 'open_shelf'
    : topologies.includes('table')
      ? 'table'
      : topologies.includes('closed_cabinet')
        ? 'closed_cabinet'
        : primary.topology;

  const openFront = [front, side, top].some((m) => m?.openFront) || primary.openFront;
  const sidePanelStrength = Math.max(
    front?.sidePanelStrength || 0,
    side?.sidePanelStrength || 0,
    top?.sidePanelStrength || 0,
    primary.sidePanelStrength
  );

  return {
    aspect: width / Math.max(1, height),
    fill: primary.fill,
    upperMass: primary.upperMass,
    lowerMass: primary.lowerMass,
    hPeaks: shelfSource.hPeaks,
    shelfBands: shelfSource.shelfBands,
    bbox: front?.bbox || primary.bbox,
    topology,
    woodTone: front?.woodTone || primary.woodTone,
    openFront,
    sidePanelStrength,
    dimsMm: {
      width: Math.min(900, Math.max(200, width)),
      height: Math.min(1200, Math.max(220, height)),
      depth: Math.min(600, Math.max(100, depth)),
    },
  };
}

export function deconstructFromMultiView(views: MultiViewCapture[]): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  if (views.length === 0) {
    return deconstructGenericPlaceholder();
  }
  if (views.length === 1) {
    return deconstructFromCanvas(views[0].canvas);
  }
  const fused = fuseMultiViewMetrics(views);
  return deconstructGenericFromMetrics(fused);
}

/** Default open-shelf placeholder matching handheld 3-tier wood rack. */
export function deconstructGenericPlaceholder(): {
  furnitureName: string;
  primitives: ScannedPrimitive[];
} {
  return deconstructGenericFromMetrics({
    aspect: 0.72,
    fill: 0.1,
    upperMass: 0.48,
    lowerMass: 0.52,
    hPeaks: 1,
    shelfBands: [0.1, 0.5, 0.9],
    bbox: { x: 0.38, y: 0.28, w: 0.28, h: 0.42 },
    topology: 'open_shelf',
    woodTone: '#d4b896',
    openFront: true,
    sidePanelStrength: 0.75,
  });
}

/** AABB distance between two OBBs (axis-aligned approximation). */
export function aabbGap(a: OrientedBoundingBox, b: OrientedBoundingBox): number {
  const dx = Math.abs(a.center.x - b.center.x) - (a.halfExtents.x + b.halfExtents.x);
  const dy = Math.abs(a.center.y - b.center.y) - (a.halfExtents.y + b.halfExtents.y);
  const dz = Math.abs(a.center.z - b.center.z) - (a.halfExtents.z + b.halfExtents.z);
  return Math.max(dx, dy, dz);
}
