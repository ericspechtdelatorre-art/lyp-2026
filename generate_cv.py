code = """
import {
  DetectedObjectMetrics,
  DensityProfile,
  PhysicalDimensions,
  ObjectClassification,
  RoiRect,
  WireframeMesh,
} from './modoA/spatialTypes';

export interface CalibrationConfig {
  mmPerPixel: number;
  depthPerspectiveFactor: number;
}

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  mmPerPixel: 0.45,
  depthPerspectiveFactor: 1.15,
};

let prevCentroid: { x: number; y: number } | null = null;
let prevMesh: WireframeMesh | null = null;

function lerp(a: number, b: number, alpha: number) {
  return a + (b - a) * alpha;
}

function generateWireframeMesh(
  meanX: number, meanY: number,
  cosT: number, sinT: number,
  minU: number, maxU: number,
  minV: number, maxV: number,
  mask: Uint8Array,
  width: number,
  height: number
): WireframeMesh {
  const NUM_SLICES = 12;
  const topEdge = [];
  const bottomEdge = [];
  
  for (let i = 0; i < NUM_SLICES; i++) {
    const u = minU + ((maxU - minU) * (i + 0.5)) / NUM_SLICES;
    let tV = minV, bV = maxV;
    
    for (let v = minV; v <= maxV; v++) {
      const x = Math.round(meanX + u * cosT - v * sinT);
      const y = Math.round(meanY + u * sinT + v * cosT);
      if (x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x]) {
        tV = v;
        break;
      }
    }
    for (let v = maxV; v >= minV; v--) {
      const x = Math.round(meanX + u * cosT - v * sinT);
      const y = Math.round(meanY + u * sinT + v * cosT);
      if (x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x]) {
        bV = v;
        break;
      }
    }
    
    topEdge.push({ x: meanX + u * cosT - tV * sinT, y: meanY + u * sinT + tV * cosT });
    bottomEdge.push({ x: meanX + u * cosT - bV * sinT, y: meanY + u * sinT + bV * cosT });
  }

  const ribbons = [];
  for (let i = 0; i < NUM_SLICES; i++) {
    ribbons.push({ top: topEdge[i], bottom: bottomEdge[i] });
  }

  const spines = [];
  for (let s = 0; s < 5; s++) {
    const alpha = s / 4;
    const spine = [];
    for (let i = 0; i < NUM_SLICES; i++) {
      spine.push({
        x: lerp(topEdge[i].x, bottomEdge[i].x, alpha),
        y: lerp(topEdge[i].y, bottomEdge[i].y, alpha)
      });
    }
    spines.push(spine);
  }

  if (prevMesh) {
    for (let i = 0; i < ribbons.length; i++) {
      ribbons[i].top.x = lerp(prevMesh.ribbons[i]?.top.x ?? ribbons[i].top.x, ribbons[i].top.x, 0.35);
      ribbons[i].top.y = lerp(prevMesh.ribbons[i]?.top.y ?? ribbons[i].top.y, ribbons[i].top.y, 0.35);
      ribbons[i].bottom.x = lerp(prevMesh.ribbons[i]?.bottom.x ?? ribbons[i].bottom.x, ribbons[i].bottom.x, 0.35);
      ribbons[i].bottom.y = lerp(prevMesh.ribbons[i]?.bottom.y ?? ribbons[i].bottom.y, ribbons[i].bottom.y, 0.35);
    }
    for (let s = 0; s < spines.length; s++) {
      for (let i = 0; i < spines[s].length; i++) {
        spines[s][i].x = lerp(prevMesh.spines[s]?.[i]?.x ?? spines[s][i].x, spines[s][i].x, 0.35);
        spines[s][i].y = lerp(prevMesh.spines[s]?.[i]?.y ?? spines[s][i].y, spines[s][i].y, 0.35);
      }
    }
  }

  return { ribbons, spines };
}

export function analyzeFrameMetrics(
  imageData: ImageData,
  calibration: CalibrationConfig = DEFAULT_CALIBRATION,
  roi?: RoiRect,
  backgroundGray?: Uint8Array
): DetectedObjectMetrics | null {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  
  const r = roi || { x: Math.floor(width * 0.15), y: Math.floor(height * 0.175), width: Math.floor(width * 0.70), height: Math.floor(height * 0.65) };
  const roiX2 = r.x + r.width;
  const roiY2 = r.y + r.height;

  const gray = new Uint8Array(totalPixels);
  const saturation = new Uint8Array(totalPixels);
  let bgLum = 128;
  
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const rv = data[idx], gv = data[idx + 1], bv = data[idx + 2];
    gray[i] = Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv);
    const mx = Math.max(rv, gv, bv), mn = Math.min(rv, gv, bv);
    saturation[i] = mx === 0 ? 0 : Math.round(((mx - mn) / mx) * 255);
  }

  const gradMag = new Float32Array(totalPixels);
  for (let y = Math.max(1, r.y); y < Math.min(height - 1, roiY2); y++) {
    for (let x = Math.max(1, r.x); x < Math.min(width - 1, roiX2); x++) {
      const i = y * width + x;
      const gx = -gray[i - width - 1] + gray[i - width + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + width - 1] + gray[i + width + 1];
      const gy = -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] + gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      gradMag[i] = Math.hypot(gx, gy);
    }
  }

  const seedX = prevCentroid ? prevCentroid.x : Math.floor(r.x + r.width / 2);
  const seedY = prevCentroid ? prevCentroid.y : Math.floor(r.y + r.height / 2);
  const seedIdx = (Math.max(0, Math.min(height-1, seedY)) * width + Math.max(0, Math.min(width-1, seedX))) * 4;
  const sR = data[seedIdx] || 128, sG = data[seedIdx+1] || 128, sB = data[seedIdx+2] || 128;

  const mask = new Uint8Array(totalPixels);
  let foregroundCount = 0;
  let sumX = 0, sumY = 0;

  for (let y = r.y; y < roiY2; y++) {
    for (let x = r.x; x < roiX2; x++) {
      const i = y * width + x;
      const idx = i * 4;
      const colorDistToSeed = Math.hypot(data[idx] - sR, data[idx+1] - sG, data[idx+2] - sB);
      const isObj = (colorDistToSeed < 45) || gradMag[i] > 50 || Math.abs(gray[i] - bgLum) > 30;
      if (isObj) {
        mask[i] = 1;
        foregroundCount++;
        sumX += x;
        sumY += y;
      }
    }
  }

  if (foregroundCount < (r.width * r.height) * 0.01) return null;

  const meanX = sumX / foregroundCount;
  const meanY = sumY / foregroundCount;

  let covXX = 0, covYY = 0, covXY = 0;
  let bboxMinX = width, bboxMaxX = 0, bboxMinY = height, bboxMaxY = 0;

  for (let y = r.y; y < roiY2; y++) {
    for (let x = r.x; x < roiX2; x++) {
      if (!mask[y * width + x]) continue;
      const dx = x - meanX, dy = y - meanY;
      covXX += dx * dx; covYY += dy * dy; covXY += dx * dy;
      if (x < bboxMinX) bboxMinX = x; if (x > bboxMaxX) bboxMaxX = x;
      if (y < bboxMinY) bboxMinY = y; if (y > bboxMaxY) bboxMaxY = y;
    }
  }
  covXX /= foregroundCount; covYY /= foregroundCount; covXY /= foregroundCount;

  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  const cosT = Math.cos(theta), sinT = Math.sin(theta);

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  const contourPoints = [];

  for (let y = bboxMinY; y <= bboxMaxY; y++) {
    for (let x = bboxMinX; x <= bboxMaxX; x++) {
      const idx = y * width + x;
      if (!mask[idx]) continue;
      const dx = x - meanX, dy = y - meanY;
      const u = dx * cosT + dy * sinT;
      const v = -dx * sinT + dy * cosT;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
      if (x === bboxMinX || x === bboxMaxX || y === bboxMinY || y === bboxMaxY || !mask[idx - 1] || !mask[idx + 1] || !mask[idx - width] || !mask[idx + width]) {
        if (contourPoints.length < 500) contourPoints.push({ x, y });
      }
    }
  }

  const wireframeMesh = generateWireframeMesh(meanX, meanY, cosT, sinT, minU, maxU, minV, maxV, mask, width, height);
  prevMesh = wireframeMesh;
  prevCentroid = { x: Math.round(meanX), y: Math.round(meanY) };

  const obbLengthPx = Math.max(1, maxU - minU);
  const obbWidthPx = Math.max(1, maxV - minV);
  const widthMm = obbLengthPx * calibration.mmPerPixel;
  const heightMm = obbWidthPx * calibration.mmPerPixel;
  const thicknessMm = 14; 
  const structuralSolidity = Math.min(1, Math.max(0.05, foregroundCount / (obbLengthPx * obbWidthPx)));

  const materialDensityGcm3 = 0.65;
  const effectiveDensityGcm3 = materialDensityGcm3 * structuralSolidity;
  const volumeCm3 = (widthMm * heightMm * thicknessMm) / 1000 * structuralSolidity;

  return {
    bbox: { x: bboxMinX, y: bboxMinY, width: bboxMaxX - bboxMinX, height: bboxMaxY - bboxMinY },
    obbCorners: [
      {x: meanX + minU * cosT - minV * sinT, y: meanY + minU * sinT + minV * cosT},
      {x: meanX + maxU * cosT - minV * sinT, y: meanY + maxU * sinT + minV * cosT},
      {x: meanX + maxU * cosT - maxV * sinT, y: meanY + maxU * sinT + maxV * cosT},
      {x: meanX + minU * cosT - maxV * sinT, y: meanY + minU * sinT + maxV * cosT},
    ],
    dimensions: { widthMm, heightMm, thicknessMm, volumeCm3, orientationDeg: (theta * 180) / Math.PI },
    density: { structuralRatio: structuralSolidity, materialDensityGcm3, effectiveDensityGcm3, estimatedMassGrams: volumeCm3 * effectiveDensityGcm3, materialClass: 'aglomerado-mdf', confidence: 0.9 },
    contourPoints,
    centroid: { x: Math.round(meanX), y: Math.round(meanY) },
    theta,
    principalAxis: { start: { x: Math.round(meanX + minU * cosT), y: Math.round(meanY + minU * sinT) }, end: { x: Math.round(meanX + maxU * cosT), y: Math.round(meanY + maxU * sinT) } },
    measurementSlices: [],
    internalHoles: 0,
    structuralSolidity,
    classification: structuralSolidity > 0.65 ? 'TABLON' : 'ESTANTERIA',
    wireframeMesh
  };
}
"""

with open('src/scanner/cvDetector.ts', 'w') as f:
    f.write(code)

