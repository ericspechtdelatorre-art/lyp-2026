// ============================================================================
// Stage 3 — IkeaLang AST & Source Code Synthesis (Zero-Leftovers)
// ============================================================================

import { AssemblyGraph, IkeaLangASTNode, IkeaPrimitiveKind } from './spatialTypes.ts';

function sanitizeIdent(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  return cleaned || 'pieza';
}

function uniqueName(base: string, used: Set<string>): string {
  let n = sanitizeIdent(base);
  if (!used.has(n)) {
    used.add(n);
    return n;
  }
  let i = 2;
  while (used.has(`${n}_${i}`)) i++;
  const out = `${n}_${i}`;
  used.add(out);
  return out;
}

export function synthesizeIkeaLangAST(graph: AssemblyGraph): IkeaLangASTNode {
  const used = new Set<string>();
  const idToVar = new Map<string, string>();

  // Aggregate legs as TORNILLO count for cleaner catalog-style CAJA
  const legs = graph.primitives.filter((p) => p.role === 'leg');
  const nonLegs = graph.primitives.filter((p) => p.role !== 'leg');

  const caja: IkeaLangASTNode['caja'] = [];

  for (const p of nonLegs) {
    const varName = uniqueName(p.name, used);
    idToVar.set(p.id, varName);
    const kind: IkeaPrimitiveKind = p.kind;
    if (kind === 'CAJON') {
      caja.push({ kind: 'CAJON', name: varName, value: `[]` });
    } else if (kind === 'ENCAJE') {
      caja.push({ kind: 'ENCAJE', name: varName, value: false });
    } else {
      const label = `${p.name}_${Math.round(p.obb.size.x)}x${Math.round(p.obb.size.z)}`;
      caja.push({ kind: 'TABLERO', name: varName, value: label });
    }
  }

  if (legs.length) {
    const totalPatas = uniqueName('total_patas', used);
    caja.push({ kind: 'TORNILLO', name: totalPatas, value: legs.length });
    legs.forEach((l) => idToVar.set(l.id, totalPatas));
  }

  // Stability flag always consumed in final step
  const estable = uniqueName('es_estable', used);
  caja.push({ kind: 'ENCAJE', name: estable, value: false });

  const herramientas = ['IMPRESORA'];
  if (graph.tippingThresholdExceeded || graph.steps.some((s) => s.requiresEntreDos)) {
    herramientas.push('NIVEL_BURBUJA');
  }

  const montaje: IkeaLangASTNode['montaje'] = [];

  for (const step of graph.steps) {
    const statements: string[] = [];
    const primary = step.partIds[0];
    const primaryVar = primary ? idToVar.get(primary) : undefined;
    const parentVar = step.parentId ? idToVar.get(step.parentId) : undefined;

    if (step.partIds.every((id) => graph.primitives.find((p) => p.id === id)?.role === 'leg')) {
      const structural =
        step.parentId && idToVar.get(step.parentId)
          ? idToVar.get(step.parentId)!
          : nonLegs.find((p) => p.role === 'top' || p.role === 'bottom' || p.role === 'frame')
            ? idToVar.get(
                nonLegs.find((p) => p.role === 'top' || p.role === 'bottom' || p.role === 'frame')!.id
              )
            : undefined;
      statements.push(
        `IMPRESORA.ESCRIBIR("Fijando " UNIR ${idToVar.get(legs[0]?.id) || 'total_patas'} UNIR " patas")`
      );
      if (structural) {
        statements.push(`${structural} = ${structural} UNIR " + Patas_x${legs.length}"`);
      }
    } else if (primaryVar) {
      const parentPrim = step.parentId
        ? graph.primitives.find((p) => p.id === step.parentId)
        : undefined;
      const childPrim = primary
        ? graph.primitives.find((p) => p.id === primary)
        : undefined;

      // Prefer mutating structural boards, never assign boards into TORNILLO counters
      if (parentVar && parentVar !== primaryVar) {
        const parentIsFastener = parentPrim?.role === 'leg' || parentPrim?.kind === 'TORNILLO';
        const childIsBoard =
          childPrim?.kind === 'TABLERO' ||
          childPrim?.role === 'top' ||
          childPrim?.role === 'frame' ||
          childPrim?.role === 'shelf';
        if (parentIsFastener && childIsBoard) {
          statements.push(`${primaryVar} = ${primaryVar} UNIR "montado_sobre_soportes"`);
        } else {
          statements.push(`${parentVar} = ${parentVar} UNIR ${primaryVar}`);
        }
      } else {
        statements.push(`${primaryVar} = ${primaryVar} UNIR "montado"`);
      }
      statements.push(`IMPRESORA.ESCRIBIR("Colocada pieza: ${step.description.replace(/"/g, '')}")`);
    }

    if (step.requiresEntreDos && graph.tippingThresholdExceeded) {
      statements.push(`SI NIVEL_BURBUJA.ESTA_NIVELADO() {`);
      statements.push(`    IMPRESORA.ESCRIBIR("Nivelacion OK durante montaje critico")`);
      statements.push(`}`);
    }

    montaje.push({
      stepNumber: step.stepNumber,
      description: step.description,
      statements,
      requiresEntreDos: step.requiresEntreDos,
    });
  }

  // Final stability check consumes es_estable
  const last = montaje[montaje.length - 1];
  if (last) {
    last.statements.push(`SI ${legs.length || nonLegs.length} ENCAJA ${legs.length || nonLegs.length} {`);
    last.statements.push(`    ${estable} = AJUSTA`);
    last.statements.push(`    IMPRESORA.ESCRIBIR("Estructura estable certificada")`);
    last.statements.push(`}`);
  } else {
    montaje.push({
      stepNumber: 1,
      description: 'Verificación final',
      statements: [`${estable} = AJUSTA`],
      requiresEntreDos: false,
    });
  }

  const terminadoRef =
    nonLegs.find((p) => p.role === 'top' || p.role === 'frame')?.id ||
    nonLegs[0]?.id ||
    legs[0]?.id;

  return {
    type: 'Program',
    mueble: sanitizeIdent(graph.furnitureName),
    herramientas,
    caja,
    montaje,
    terminado: terminadoRef ? idToVar.get(terminadoRef) || estable : estable,
  };
}

function formatCajaValue(kind: IkeaPrimitiveKind, value: string | number | boolean): string {
  if (kind === 'CAJON') return '[]';
  if (kind === 'ENCAJE') return value === true || value === 'AJUSTA' ? 'AJUSTA' : 'SUELTO';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'AJUSTA' : 'SUELTO';
  return `"${value}"`;
}

/** Serialize AST → valid .ikea source (Zero-Leftovers: every CAJA symbol used in MONTAJE/TERMINADO). */
export function serializeIkeaLang(ast: IkeaLangASTNode): string {
  const lines: string[] = [];
  lines.push(`MUEBLE ${ast.mueble}`);
  lines.push('');
  lines.push('HERRAMIENTAS {');
  for (const h of ast.herramientas) {
    lines.push(`    TRAER ${h}`);
  }
  lines.push('}');
  lines.push('');
  lines.push('CAJA {');
  for (const c of ast.caja) {
    lines.push(`    ${c.kind} ${c.name} = ${formatCajaValue(c.kind, c.value)}`);
  }
  lines.push('}');
  lines.push('');
  lines.push('MONTAJE {');
  for (const paso of ast.montaje) {
    lines.push(`    PASO ${paso.stepNumber}: "${paso.description}" {`);
    const body = paso.requiresEntreDos
      ? [
          '        ENTRE_DOS {',
          ...paso.statements.map((s) => `            ${s}`),
          '        }',
        ]
      : paso.statements.map((s) => `        ${s}`);
    lines.push(...body);
    lines.push('    }');
    lines.push('');
  }
  lines.push('}');
  lines.push('');
  lines.push(`TERMINADO ${ast.terminado};`);
  lines.push('');
  return lines.join('\n');
}

/** Annotate graph steps with approximate code line ranges after serialization. */
export function annotateStepCodeLines(
  graph: AssemblyGraph,
  sourceCode: string
): AssemblyGraph {
  const lines = sourceCode.split('\n');
  const steps = graph.steps.map((step) => {
    const needle = `PASO ${step.stepNumber}:`;
    const start = lines.findIndex((l) => l.includes(needle));
    if (start < 0) return step;
    let end = start;
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].includes('PASO ') || lines[i].trim() === '}') {
        // closing of this PASO block: find matching }
        if (lines[i].trim() === '}' && !lines[i].includes('PASO')) {
          end = i;
          break;
        }
        if (lines[i].includes('PASO ') && i > start) {
          end = i - 1;
          break;
        }
      }
      end = i;
    }
    // Refine: find first closing brace at PASO indent after start
    let depth = 0;
    end = start;
    for (let i = start; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      end = i;
      if (i > start && depth <= 0) break;
    }
    return { ...step, codeLineStart: start + 1, codeLineEnd: end + 1 };
  });
  return { ...graph, steps };
}
