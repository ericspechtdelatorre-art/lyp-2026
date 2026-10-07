// ============================================================================
// Modo A — Spatial Data Model (Reverse Engineering & Assembly Twin)
// ============================================================================

/** IkeaLang primitive kinds inferred from geometry */
export type IkeaPrimitiveKind = 'TABLERO' | 'TORNILLO' | 'CAJON' | 'ENCAJE' | 'HUECO';

export type PartRole =
  | 'top'
  | 'bottom'
  | 'side'
  | 'back'
  | 'shelf'
  | 'leg'
  | 'drawer'
  | 'fastener'
  | 'frame'
  | 'unknown';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Oriented Bounding Box in world space (mm, Y-up, floor at Y=0) */
export interface OrientedBoundingBox {
  center: Vec3;
  /** Half-extents along local axes (mm) */
  halfExtents: Vec3;
  /** Local axes as orthonormal basis (columns of rotation) */
  axes: [Vec3, Vec3, Vec3];
  /** Full size convenience: 2 * halfExtents */
  size: Vec3;
}

export interface PhysicalDimensions {
  widthMm: number;        // Largo principal en mm (eje U del PCA)
  heightMm: number;       // Ancho secundario en mm (eje V del PCA)
  thicknessMm: number;    // Grosor real de la pieza/perfil en mm
  volumeCm3: number;      // Volumen real descontando huecos
  orientationDeg: number; // Ángulo de inclinación detectado por PCA
}

export interface DensityProfile {
  structuralRatio: number;      // 0.0 - 1.0 (proporción maciza vs hueca)
  materialDensityGcm3: number;  // Densidad estimada en g/cm³
  effectiveDensityGcm3: number; // structuralRatio * materialDensityGcm3
  estimatedMassGrams: number;   // Masa total estimada
  materialClass: 'ligero-alveolar' | 'aglomerado-mdf' | 'madera-maciza' | 'polimero-denso' | 'metal';
  confidence: number;
}

/** ROI (Region of Interest) rectangle in pixel coordinates */
export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ROI scan mode */
export type RoiMode = 'horizontal' | 'vertical' | 'libre';

/** Classification of detected object */
export type ObjectClassification =
  | 'TABLON'    // Rectangular plank/board
  | 'LISTON'    // Very narrow and long stick/leg (aspect > 6)
  | 'PANEL'     // Nearly square panel (aspect < 1.8)
  | 'ESTANTERIA' // Multi-shelf furniture (needs >=2 internal holes, solidity <0.60)
  | 'MUEBLE';    // Generic assembled furniture

export interface WireframeMesh {
  ribbons: Array<{
    top: { x: number; y: number };
    bottom: { x: number; y: number };
  }>;
  spines: Array<Array<{ x: number; y: number }>>;
}

/** Complete detection output from the CV pipeline */
export interface DetectedObjectMetrics {
  bbox: { x: number; y: number; width: number; height: number };
  obbCorners: Array<{ x: number; y: number }>;
  dimensions: PhysicalDimensions;
  density: DensityProfile;
  contourPoints: Array<{ x: number; y: number }>;
  /** PCA center in pixel space */
  centroid: { x: number; y: number };
  /** PCA orientation angle in radians */
  theta: number;
  /** Axis principal endpoints for HUD drawing */
  principalAxis: { start: { x: number; y: number }; end: { x: number; y: number } };
  /** Transverse measurement slices for HUD drawing */
  measurementSlices: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    widthPx: number;
  }>;
  /** Number of internal mass→void→mass transitions (holes) */
  internalHoles: number;
  /** Structural solidity: foreground pixels / OBB area */
  structuralSolidity: number;
  /** Classified object type based on geometry + holes */
  classification: ObjectClassification;
  /** 2.5D wireframe mesh wrapped around object */
  wireframeMesh?: WireframeMesh;
}

export interface CapturedView {
  id: ScanViewId;
  thumbnailDataUrl: string;
  majorDimMm: number;
  minorDimMm: number;
  solidity: number;
  holeCount: number;
  textureDensityScore: number;
  materialDensityGcm3: number;
}

export interface ScannedPrimitive {
  id: string;
  name: string;
  kind: IkeaPrimitiveKind;
  role: PartRole;
  obb: OrientedBoundingBox;
  /** Material tone hex for viewport tinting */
  materialTone: string;
  confidence: number;
  /** Screen-space bbox for 2D overlay (normalized 0..1) */
  screenBBox: { x: number; y: number; width: number; height: number };
  /** Approximate mass proxy for tipping heuristics (kg) */
  massKg: number;
  /** Outward explode direction (unit vector from parent) */
  explodeNormal: Vec3;
  /** Physical metrics detected by computer vision */
  detectedMetrics?: DetectedObjectMetrics;
}

export interface ContactJoint {
  id: string;
  aId: string;
  bId: string;
  contactPoint: Vec3;
  contactNormal: Vec3;
  /** Area proxy / strength of contact */
  strength: number;
  jointType: 'face' | 'edge' | 'dowel' | 'screw';
}

export interface AssemblyStepNode {
  stepNumber: number;
  description: string;
  /** Primitive ids assembled in this step */
  partIds: string[];
  /** Parent structure this attaches to (null = ground / first base) */
  parentId: string | null;
  /** Use ENTRE_DOS concurrency wrapper for safety */
  requiresEntreDos: boolean;
  /** Code line hint after synthesis (1-based) */
  codeLineStart?: number;
  codeLineEnd?: number;
}

export interface AssemblyGraph {
  furnitureName: string;
  primitives: ScannedPrimitive[];
  joints: ContactJoint[];
  /** Topologically ordered assembly steps (bottom-up) */
  steps: AssemblyStepNode[];
  groundAnchors: string[];
  tippingThresholdExceeded: boolean;
}

/** Lightweight AST-shaped payload produced by synthesizer (pre-format) */
export interface IkeaLangASTNode {
  type: 'Program';
  mueble: string;
  herramientas: string[];
  caja: Array<{
    kind: IkeaPrimitiveKind;
    name: string;
    value: string | number | boolean;
  }>;
  montaje: Array<{
    stepNumber: number;
    description: string;
    statements: string[];
    requiresEntreDos: boolean;
  }>;
  terminado: string;
}

export interface CollisionFlag {
  partId: string;
  stepNumber: number;
  code: 'ACCESO_BLOQUEADO';
  message: string;
}

export type ModoAPresetId = 'lack' | 'kallax' | 'alex' | 'chair' | 'billy';

/** Guided multi-view webcam capture angles */
export type ScanViewId = 'front' | 'side' | 'top';

export interface ModoAPipelineResult {
  graph: AssemblyGraph;
  ast: IkeaLangASTNode;
  sourceCode: string;
  reverseSteps: Array<{ step: number; action: string; removedPart: string }>;
  inventoryRemaining: Record<string, number>;
  collisionFlags: CollisionFlag[];
  /** Number of camera/image views used for reconstruction */
  viewCount?: number;
}