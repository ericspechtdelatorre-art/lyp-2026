// ============================================================================
// Modo A Pipeline — Camera/Preset → Graph → .ikea → Twin payload
// ============================================================================

import { detectAccessCollisions, resolveAssemblyHierarchy } from './assemblyGraph.ts';
import {
  annotateStepCodeLines,
  serializeIkeaLang,
  synthesizeIkeaLangAST,
} from './codeSynthesizer.ts';
import {
  deconstructFromCanvas,
  deconstructFromMultiView,
  deconstructGenericPlaceholder,
  MultiViewCapture,
  deconstructSinglePiece,
  fuseThreeViewsMetrics,
} from './geometricDeconstruction.ts';
import { ModoAPipelineResult, DetectedObjectMetrics, CapturedView } from './spatialTypes.ts';

function buildInventory(graph: ReturnType<typeof resolveAssemblyHierarchy>): Record<string, number> {
  const inv: Record<string, number> = {};
  for (const p of graph.primitives) {
    inv[p.id] = 1;
  }
  return inv;
}

function buildReverseSteps(
  graph: ReturnType<typeof resolveAssemblyHierarchy>
): ModoAPipelineResult['reverseSteps'] {
  return [...graph.steps]
    .reverse()
    .map((s, i) => ({
      step: i + 1,
      action: `Retirar: ${s.description.replace(/^Unir |^Fijar |^Anclar /, '')}`,
      removedPart: s.partIds[0] || '',
    }));
}

export function runModoAGeneric(): ModoAPipelineResult {
  const { furnitureName, primitives } = deconstructGenericPlaceholder();
  return finalize(furnitureName, primitives, 0);
}

export function runModoAFromDetection(metrics: DetectedObjectMetrics): ModoAPipelineResult {
  const isSinglePiece = metrics.classification === 'TABLON' || 
    metrics.classification === 'LISTON' || 
    metrics.classification === 'PANEL';
  
  if (isSinglePiece) {
    const { furnitureName, primitives } = deconstructSinglePiece(metrics);
    return finalize(furnitureName, primitives, 1);
  }
  const { furnitureName, primitives } = deconstructGenericPlaceholder();
  return finalize(furnitureName, primitives, 1);
}

export function runModoAFromThreeViews(views: CapturedView[]): ModoAPipelineResult {
  const front = views.find(v => v.id === 'front');
  const side = views.find(v => v.id === 'side');
  const top = views.find(v => v.id === 'top');
  if (front && side && top) {
    const fused = fuseThreeViewsMetrics(front, side, top);
    return runModoAFromDetection(fused);
  }
  return runModoAGeneric();
}

export function runModoAFromCanvas(canvas: HTMLCanvasElement): ModoAPipelineResult {
  const { furnitureName, primitives } = deconstructFromCanvas(canvas);
  return finalize(furnitureName, primitives, 1);
}

export function runModoAFromMultiView(views: MultiViewCapture[]): ModoAPipelineResult {
  const { furnitureName, primitives } = deconstructFromMultiView(views);
  return finalize(furnitureName, primitives, views.length);
}

function finalize(
  furnitureName: string,
  primitives: import('./spatialTypes.ts').ScannedPrimitive[],
  viewCount = 1
): ModoAPipelineResult {
  let graph = resolveAssemblyHierarchy(furnitureName, primitives);
  const collisionFlags = detectAccessCollisions(graph);
  const ast = synthesizeIkeaLangAST(graph);
  const sourceCode = serializeIkeaLang(ast);
  graph = annotateStepCodeLines(graph, sourceCode);

  return {
    graph,
    ast,
    sourceCode,
    reverseSteps: buildReverseSteps(graph),
    inventoryRemaining: buildInventory(graph),
    collisionFlags,
    viewCount,
  };
}

export function inventoryAtStep(
  result: ModoAPipelineResult,
  assembledStep: number
): Record<string, number> {
  const inv = { ...result.inventoryRemaining };
  for (const step of result.graph.steps) {
    if (step.stepNumber > assembledStep) break;
    for (const id of step.partIds) {
      inv[id] = 0;
    }
  }
  return inv;
}
