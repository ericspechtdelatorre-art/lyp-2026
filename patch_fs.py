import re

with open('src/scanner/FurnitureScanner.tsx', 'r') as f:
    code = f.read()

# Update CapturedView interface
code = code.replace("""interface CapturedView {
  id: ScanViewId;
  canvas: HTMLCanvasElement;
  thumbnail: string;
}""", """interface CapturedViewLocal {
  id: ScanViewId;
  canvas: HTMLCanvasElement;
  thumbnail: string;
  metrics?: import('./modoA/spatialTypes').DetectedObjectMetrics;
}""")

# Update type of captures state
code = code.replace("""const [captures, setCaptures] = useState<CapturedView[]>([]);""", """const [captures, setCaptures] = useState<CapturedViewLocal[]>([]);""")

# Update analyzeMultiView signature
code = code.replace("""const analyzeMultiView = async (views: CapturedView[]) => {""", """const analyzeMultiView = async (views: CapturedViewLocal[]) => {""")

# Update analyzeMultiView body to use runModoAFromThreeViews if all have metrics
new_analyze = """
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
"""

code = re.sub(r"const next = runModoAFromMultiView\(views.map\(\(v\) => \(\{ id: v.id, canvas: v.canvas \}\)\)\);", new_analyze, code)

# In captureCurrentView, save metrics
capture_mod = """
    const m = metricsRef.current;
    const nextCaptures = [
      ...captures.filter((c) => c.id !== view.id),
      { id: view.id, canvas, thumbnail, metrics: m || undefined },
    ];
"""
code = re.sub(r"const nextCaptures = \[\s*\.\.\.captures.filter\(\(c\) => c.id !== view.id\),\s*\{ id: view.id, canvas, thumbnail \},\s*\];", capture_mod, code)

# Update drawHud for Wireframe
hud_mod = """
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
"""
code = re.sub(r"  // ── Contour \(green/cyan\) ──.*?(?=  // ── Telemetry label ──)", hud_mod, code, flags=re.DOTALL)

with open('src/scanner/FurnitureScanner.tsx', 'w') as f:
    f.write(code)
