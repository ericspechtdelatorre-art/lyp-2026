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
  deconstructGenericPlaceholder,
} from './geometricDeconstruction.ts';
import { ModoAPipelineResult } from './spatialTypes.ts';

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
  // Reverse of assembly = disassembly order
  return [...graph.steps]
    .reverse()
    .map((s, i) => ({
      step: i + 1,
      action: `Retirar: ${s.description.replace(/^Unir |^Fijar |^Anclar /, '')}`,
      removedPart: s.partIds[0] || '',
    }));
}

/** Initial / default scan — universal pipeline, not tied to a catalog model. */
export function runModoAGeneric(): ModoAPipelineResult {
  const { furnitureName, primitives } = deconstructGenericPlaceholder();
  return finalize(furnitureName, primitives);
}

export function runModoAFromCanvas(canvas: HTMLCanvasElement): ModoAPipelineResult {
  const { furnitureName, primitives } = deconstructFromCanvas(canvas);
  return finalize(furnitureName, primitives);
}

function finalize(
  furnitureName: string,
  primitives: import('./spatialTypes.ts').ScannedPrimitive[]
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
  };
}

/** Decrement inventory as assembly timeline advances (parts consumed). */
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
