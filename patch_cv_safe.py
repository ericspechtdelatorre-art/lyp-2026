import re

with open('src/scanner/cvDetector.ts', 'r') as f:
    code = f.read()

state_vars = """
let prevCentroid: { x: number; y: number } | null = null;
let prevMesh: import('./modoA/spatialTypes').WireframeMesh | null = null;

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
) {
  const NUM_SLICES = 12; // 12 transverse ribs
  const topEdge: Array<{x: number, y: number}> = [];
  const bottomEdge: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i < NUM_SLICES; i++) {
    const u = minU + ((maxU - minU) * (i + 0.5)) / NUM_SLICES;
    let foundTop = false;
    let foundBottom = false;
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
    
    topEdge.push({
      x: meanX + u * cosT - tV * sinT,
      y: meanY + u * sinT + tV * cosT
    });
    bottomEdge.push({
      x: meanX + u * cosT - bV * sinT,
      y: meanY + u * sinT + bV * cosT
    });
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

"""

code = code.replace("export const DEFAULT_CALIBRATION:", state_vars + "\nexport const DEFAULT_CALIBRATION:")

mask_logic = """
  // ── Seeded segmentation ──
  const seedX = prevCentroid ? prevCentroid.x : Math.floor(r.x + r.width / 2);
  const seedY = prevCentroid ? prevCentroid.y : Math.floor(r.y + r.height / 2);
  const seedIdx = (seedY * width + seedX) * 4;
  const sR = data[seedIdx] || 0, sG = data[seedIdx+1] || 0, sB = data[seedIdx+2] || 0;

  const mask = new Uint8Array(totalPixels);
  let foregroundCount = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = r.y; y < roiY2; y++) {
    for (let x = r.x; x < roiX2; x++) {
      const i = y * width + x;
      const idx = i * 4;
      const r_c = data[idx], g_c = data[idx+1], b_c = data[idx+2];
      const colorDistToSeed = Math.hypot(r_c - sR, g_c - sG, b_c - sB);
      
      const isObj = (colorDistToSeed < 60) || gradMag[i] > 45 || Math.abs(gray[i] - bgLum) > 28;

      if (isObj) {
        mask[i] = 1;
        foregroundCount++;
        sumX += x;
        sumY += y;
      }
    }
  }
"""
code = re.sub(r"const mask = new Uint8Array\(totalPixels\);.*?for \(let y = r\.y; y < roiY2; y\+\+.*?\}", mask_logic, code, flags=re.DOTALL | re.MULTILINE)

target_return = """  return {
    bbox: { x: bboxMinX, y: bboxMinY, width: bboxMaxX - bboxMinX, height: bboxMaxY - bboxMinY },"""

replacement = """  const wireframeMesh = generateWireframeMesh(meanX, meanY, cosT, sinT, minU, maxU, minV, maxV, mask, width, height);
  prevMesh = wireframeMesh;
  prevCentroid = { x: Math.round(meanX), y: Math.round(meanY) };

  return {
    wireframeMesh,
    bbox: { x: bboxMinX, y: bboxMinY, width: bboxMaxX - bboxMinX, height: bboxMaxY - bboxMinY },"""

code = code.replace(target_return, replacement)

with open('src/scanner/cvDetector.ts', 'w') as f:
    f.write(code)

