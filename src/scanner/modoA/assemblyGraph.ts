// ============================================================================
// Stage 2 — Contact Graph & Topological Assembly Hierarchy
// ============================================================================

import { aabbGap } from './geometricDeconstruction.ts';
import {
  AssemblyGraph,
  AssemblyStepNode,
  CollisionFlag,
  ContactJoint,
  ScannedPrimitive,
  Vec3,
} from './spatialTypes.ts';

const CONTACT_THRESHOLD_MM = 35;
const TIPPING_WIDTH_MM = 900;
const TIPPING_MASS_KG = 25;

function mid(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function extractContactGraph(primitives: ScannedPrimitive[]): ContactJoint[] {
  const joints: ContactJoint[] = [];
  for (let i = 0; i < primitives.length; i++) {
    for (let j = i + 1; j < primitives.length; j++) {
      const a = primitives[i];
      const b = primitives[j];
      const gap = aabbGap(a.obb, b.obb);
      if (gap > CONTACT_THRESHOLD_MM) continue;

      const n = normalize({
        x: b.obb.center.x - a.obb.center.x,
        y: b.obb.center.y - a.obb.center.y,
        z: b.obb.center.z - a.obb.center.z,
      });

      const strength = Math.max(0.1, 1 - gap / CONTACT_THRESHOLD_MM);
      let jointType: ContactJoint['jointType'] = 'face';
      if (a.role === 'leg' || b.role === 'leg') jointType = 'screw';
      else if (a.role === 'shelf' || b.role === 'shelf') jointType = 'dowel';
      else if (gap > 10) jointType = 'edge';

      joints.push({
        id: `joint-${a.id}-${b.id}`,
        aId: a.id,
        bId: b.id,
        contactPoint: mid(a.obb.center, b.obb.center),
        contactNormal: n,
        strength,
        jointType,
      });
    }
  }
  return joints;
}

function isGrounded(p: ScannedPrimitive): boolean {
  const bottom = p.obb.center.y - p.obb.halfExtents.y;
  return bottom <= 5 || p.role === 'leg' || p.role === 'bottom';
}

/**
 * Bottom-up topological sort:
 * 1. Ground anchors first (legs / bottom panels)
 * 2. Then parts connected to already-placed structure, preferring lower Y
 * 3. Finally remaining floating parts
 */
export function resolveAssemblyHierarchy(
  furnitureName: string,
  primitives: ScannedPrimitive[]
): AssemblyGraph {
  const joints = extractContactGraph(primitives);
  const byId = new Map(primitives.map((p) => [p.id, p]));
  const neighbors = new Map<string, Set<string>>();
  for (const p of primitives) neighbors.set(p.id, new Set());
  for (const j of joints) {
    neighbors.get(j.aId)?.add(j.bId);
    neighbors.get(j.bId)?.add(j.aId);
  }

  const groundAnchors = primitives.filter(isGrounded).map((p) => p.id);
  const placed = new Set<string>();
  const steps: AssemblyStepNode[] = [];

  const sortedAnchors = [...primitives]
    .filter((p) => groundAnchors.includes(p.id))
    .sort((a, b) => a.obb.center.y - b.obb.center.y || a.name.localeCompare(b.name));

  // Step 1: place all ground anchors together if similar role, else one-by-one for legs
  const legs = sortedAnchors.filter((p) => p.role === 'leg');
  const bottoms = sortedAnchors.filter((p) => p.role !== 'leg');

  if (bottoms.length) {
    for (const b of bottoms) {
      steps.push({
        stepNumber: steps.length + 1,
        description: `Anclar base ${b.name} al plano del suelo`,
        partIds: [b.id],
        parentId: null,
        requiresEntreDos: false,
      });
      placed.add(b.id);
    }
  }

  if (legs.length) {
    const totalWidth =
      Math.max(...legs.map((l) => l.obb.center.x + l.obb.halfExtents.x)) -
      Math.min(...legs.map((l) => l.obb.center.x - l.obb.halfExtents.x));
    const totalMass = legs.reduce((s, l) => s + l.massKg, 0) +
      [...placed].reduce((s, id) => s + (byId.get(id)?.massKg || 0), 0);
    const needsEntreDos = totalWidth > TIPPING_WIDTH_MM || totalMass > TIPPING_MASS_KG;

    steps.push({
      stepNumber: steps.length + 1,
      description: `Fijar ${legs.length} patas / soportes verticales`,
      partIds: legs.map((l) => l.id),
      parentId: bottoms[0]?.id ?? null,
      requiresEntreDos: needsEntreDos,
    });
    legs.forEach((l) => placed.add(l.id));
  }

  // Remaining parts by ascending Y, preferring contact with placed set
  const remaining = primitives
    .filter((p) => !placed.has(p.id))
    .sort((a, b) => a.obb.center.y - b.obb.center.y);

  while (remaining.length) {
    let idx = remaining.findIndex((p) =>
      [...(neighbors.get(p.id) || [])].some((n) => placed.has(n))
    );
    if (idx < 0) idx = 0;
    const part = remaining.splice(idx, 1)[0];
    const parent =
      [...(neighbors.get(part.id) || [])].find((n) => placed.has(n)) ??
      [...placed][0] ??
      null;

    const assembledMass =
      [...placed].reduce((s, id) => s + (byId.get(id)?.massKg || 0), 0) + part.massKg;
    const spanX = Math.max(
      part.obb.size.x,
      ...[...placed].map((id) => byId.get(id)?.obb.size.x || 0)
    );
    const requiresEntreDos =
      (part.role === 'top' || part.role === 'back') &&
      (assembledMass > TIPPING_MASS_KG || spanX > TIPPING_WIDTH_MM);

    steps.push({
      stepNumber: steps.length + 1,
      description: `Unir ${part.name} a la estructura`,
      partIds: [part.id],
      parentId: parent,
      requiresEntreDos,
    });
    placed.add(part.id);
  }

  const tippingThresholdExceeded = steps.some((s) => s.requiresEntreDos);

  return {
    furnitureName,
    primitives,
    joints,
    steps,
    groundAnchors,
    tippingThresholdExceeded,
  };
}

/**
 * Detect blocked assembly: trying to insert a shelf/drawer into a closed frame
 * after the top/back already encapsulate the cavity.
 */
export function detectAccessCollisions(graph: AssemblyGraph): CollisionFlag[] {
  const flags: CollisionFlag[] = [];
  const byId = new Map(graph.primitives.map((p) => [p.id, p]));

  for (const step of graph.steps) {
    for (const partId of step.partIds) {
      const part = byId.get(partId);
      if (!part || (part.role !== 'shelf' && part.role !== 'drawer')) continue;

      // Parts already placed before this step
      const prior = new Set<string>();
      for (const s of graph.steps) {
        if (s.stepNumber >= step.stepNumber) break;
        s.partIds.forEach((id) => prior.add(id));
      }

      const closedByTop = [...prior].some((id) => byId.get(id)?.role === 'top');
      const closedByBack = [...prior].some((id) => byId.get(id)?.role === 'back');
      const hasSides =
        [...prior].filter((id) => byId.get(id)?.role === 'side').length >= 2;

      if (closedByTop && closedByBack && hasSides && part.role === 'shelf') {
        flags.push({
          partId,
          stepNumber: step.stepNumber,
          code: 'ACCESO_BLOQUEADO',
          message: `ERROR: ACCESO_BLOQUEADO — '${part.name}' no puede insertarse: el bastidor ya está cerrado (top+back+laterales). Reordena el PASO.`,
        });
      }
    }
  }
  return flags;
}
