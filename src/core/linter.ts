// ============================================================================
// IKEALang v1.1 - Semantic Analyzer & Strict Linter
// ============================================================================

import {
  ProgramNode,
  VariableDeclarationNode,
  ImportNode,
  StatementNode,
  ExpressionNode,
  Diagnostic,
  IkeaType,
} from './types.ts';

export class Linter {
  private program: ProgramNode;
  private diagnostics: Diagnostic[] = [];

  constructor(program: ProgramNode) {
    this.program = program;
  }

  public lint(): Diagnostic[] {
    this.diagnostics = [];

    // 1. Collect declared variables in CAJA
    const declaredVars = new Map<string, { node: VariableDeclarationNode; usedCount: number }>();
    for (const v of this.program.caja) {
      declaredVars.set(v.name, { node: v, usedCount: 0 });
    }

    // 2. Collect declared tools/imports in HERRAMIENTAS
    const declaredTools = new Map<string, { node: ImportNode; usedCount: number }>();
    for (const imp of this.program.herramientas) {
      const toolName = imp.alias || imp.target.split(' ')[0].replace(/"/g, '');
      declaredTools.set(toolName, { node: imp, usedCount: 0 });
    }

    // 3. Scan all statements in MONTAJE and PLANOS
    let insideEntreDos = false;

    const scanExpression = (expr: ExpressionNode) => {
      if (!expr) return;

      switch (expr.type) {
        case 'Identifier': {
          const varEntry = declaredVars.get(expr.name);
          if (varEntry) {
            varEntry.usedCount++;
          }
          const toolEntry = declaredTools.get(expr.name);
          if (toolEntry) {
            toolEntry.usedCount++;
          }
          break;
        }

        case 'MemberCallExpression': {
          // Check if object is a tool
          const obj = expr.object;
          if (['IMPRESORA', 'MATEMATICAS', 'NIVEL_BURBUJA', 'CRONOMETRO', 'FICHEROS'].includes(obj) || declaredTools.has(obj)) {
            const tool = declaredTools.get(obj);
            if (tool) {
              tool.usedCount++;
            } else {
              // Tool used without being imported!
              this.diagnostics.push({
                id: `err-tool-${expr.loc.line}-${expr.loc.column}`,
                code: 'FALTA_HERRAMIENTA',
                message: `ERROR 103: FALTA_HERRAMIENTA: Se intentó utilizar '${obj}.${expr.method}()' sin importar la herramienta '${obj}' en HERRAMIENTAS.`,
                severity: 'error',
                line: expr.loc.line,
                column: expr.loc.column,
                mascotHint: `¡Necesitas la herramienta adecuada! Añade 'TRAER ${obj}' dentro de HERRAMIENTAS { ... } antes de usarla.`,
                quickFixSuggestion: `Añadir 'TRAER ${obj}' al bloque HERRAMIENTAS`,
              });
            }

            // Concurrency suggestion: heavy operations (network, http, heavy file read) can optionally use ENTRE_DOS for parallel speedup
            const isHeavy = /GET|POST|DESCARGAR|PETICION|LEER_GRANDE|SINCRONIZAR/i.test(expr.method);
            if (isHeavy && !insideEntreDos) {
              this.diagnostics.push({
                id: `info-entredos-${expr.loc.line}`,
                code: 'INFO',
                message: `SUGERENCIA CONCURRENCIA: La operación '${obj}.${expr.method}' puede beneficiarse de un bloque 'ENTRE_DOS { ... }' para acelerar el ensamblaje en paralelo.`,
                severity: 'info',
                line: expr.loc.line,
                column: expr.loc.column,
                mascotHint: 'Consejo de montaje: dos personas montan más rápido. Puedes envolver esta llamada en ENTRE_DOS { ... } si deseas paralelizarla.',
                quickFixSuggestion: `Envolver '${obj}.${expr.method}(...)' en un bloque ENTRE_DOS { ... }`,
              });
            }
          } else {
            // It might be a variable method (e.g. cajon.UNIR, texto.A_TORNILLO)
            const v = declaredVars.get(obj);
            if (v) {
              v.usedCount++;
            }
          }

          expr.args.forEach(scanExpression);
          break;
        }

        case 'BinaryExpression':
          scanExpression(expr.left);
          scanExpression(expr.right);
          this.checkBinaryTypes(expr);
          break;

        case 'UnaryExpression':
          scanExpression(expr.argument);
          break;

        case 'CallExpression':
          expr.args.forEach(scanExpression);
          break;

        case 'ArrayLiteral':
          expr.elements.forEach(scanExpression);
          break;
      }
    };

    const scanStatement = (stmt: StatementNode) => {
      if (!stmt) return;

      switch (stmt.type) {
        case 'Assignment': {
          const v = declaredVars.get(stmt.target);
          if (v) {
            v.usedCount++;
            this.checkAssignmentType(v.node, stmt.value);
          }
          scanExpression(stmt.value);
          break;
        }

        case 'ExpressionStatement':
          scanExpression(stmt.expression);
          break;

        case 'Si':
          scanExpression(stmt.condition);
          stmt.consequent.forEach(scanStatement);
          if (stmt.alternate) stmt.alternate.forEach(scanStatement);
          break;

        case 'Repetir':
          scanExpression(stmt.count);
          stmt.body.forEach(scanStatement);
          break;

        case 'MientrasAjuste':
          scanExpression(stmt.condition);
          stmt.body.forEach(scanStatement);
          break;

        case 'PorCada':
          scanExpression(stmt.collection);
          stmt.body.forEach(scanStatement);
          break;

        case 'EntreDos': {
          const prevInside = insideEntreDos;
          insideEntreDos = true;
          stmt.body.forEach(scanStatement);
          insideEntreDos = prevInside;
          break;
        }

        case 'Terminado':
          scanExpression(stmt.value);
          break;
      }
    };

    // Scan all pasos
    for (const paso of this.program.montaje) {
      for (const stmt of paso.body) {
        scanStatement(stmt);
      }
    }

    // Scan planos
    for (const plano of this.program.planos) {
      for (const stmt of plano.body) {
        scanStatement(stmt);
      }
    }

    // Scan final TERMINADO expression
    scanExpression(this.program.terminado);

    // 4. CHECK RULE 1: PIEZAS_SOBRANTES (Zero-Leftovers Principle)
    for (const [name, entry] of declaredVars.entries()) {
      if (entry.usedCount === 0) {
        this.diagnostics.push({
          id: `sobrante-var-${entry.node.loc.line}-${name}`,
          code: 'PIEZAS_SOBRANTES',
          message: `ERROR 101: PIEZAS_SOBRANTES: La pieza '${name}' (${entry.node.varType}) fue declarada en CAJA pero NUNCA se usó en ningún PASO. En IKEA no sobran piezas.`,
          severity: 'error',
          line: entry.node.loc.line,
          column: entry.node.loc.column,
          mascotHint: `El muñeco de IKEA se rasca la cabeza: tienes la pieza '${name}' olvidada en el suelo. Úsala o retírala de la CAJA.`,
          quickFixSuggestion: `Eliminar '${name}' de CAJA o usarla en un PASO`,
        });
      }
    }

    for (const [name, entry] of declaredTools.entries()) {
      if (entry.usedCount === 0) {
        this.diagnostics.push({
          id: `sobrante-tool-${entry.node.loc.line}-${name}`,
          code: 'PIEZAS_SOBRANTES',
          message: `ERROR 101: PIEZAS_SOBRANTES: La herramienta '${name}' fue importada en HERRAMIENTAS pero nunca se utilizó.`,
          severity: 'warning',
          line: entry.node.loc.line,
          column: entry.node.loc.column,
          mascotHint: `Has sacado '${name}' de la ferretería pero no la has utilizado en el montaje.`,
          quickFixSuggestion: `Retirar 'TRAER ${name}' de HERRAMIENTAS`,
        });
      }
    }

    return this.diagnostics;
  }

  private checkAssignmentType(decl: VariableDeclarationNode, expr: ExpressionNode) {
    if (expr.type === 'Literal') {
      const lit = expr;
      if (decl.varType === 'TORNILLO' && lit.valueType === 'TABLERO') {
        this.diagnostics.push({
          id: `tornillo-pasado-${decl.loc.line}`,
          code: 'TORNILLO_PASADO',
          message: `ERROR 102: TORNILLO_PASADO: Conflicto de tipos. Asignando un TABLERO (texto) a un TORNILLO (numérico) '${decl.name}'.`,
          severity: 'error',
          line: expr.loc.line,
          column: expr.loc.column,
          mascotHint: 'Has forzado la rosca: intentaste meter una tabla en el orificio de un tornillo.',
        });
      }
    }
  }

  private checkBinaryTypes(expr: any) {
    // e.g. dividing or subtracting strings directly
    if (expr.operator === 'RETIRAR' || expr.operator === 'DUPLICAR' || expr.operator === 'SECCIONAR') {
      if (expr.left.type === 'Literal' && expr.left.valueType === 'TABLERO' && expr.operator === 'SECCIONAR') {
        this.diagnostics.push({
          id: `tornillo-pasado-op-${expr.loc.line}`,
          code: 'TORNILLO_PASADO',
          message: `ERROR 102: TORNILLO_PASADO: Operación ${expr.operator} no permitida sobre TABLERO.`,
          severity: 'error',
          line: expr.loc.line,
          column: expr.loc.column,
          mascotHint: '¡No puedes serrar un texto sin una regla milimétrica!',
        });
      }
    }
  }
}
