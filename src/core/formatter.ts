// ============================================================================
// IKEALang v1.1 - Canonical Code Formatter & AST-to-Code Serializer
// ============================================================================

import {
  ProgramNode,
  ImportNode,
  VariableDeclarationNode,
  PlanoNode,
  PasoNode,
  StatementNode,
  ExpressionNode,
} from './types.ts';

export class Formatter {
  public static format(ast: ProgramNode): string {
    const lines: string[] = [];

    // 1. MUEBLE <Nombre>
    lines.push(`MUEBLE ${ast.mueble}`);
    lines.push('');

    // 2. HERRAMIENTAS { ... }
    lines.push('HERRAMIENTAS {');
    if (ast.herramientas.length === 0) {
      lines.push('    TRAER IMPRESORA');
    } else {
      for (const imp of ast.herramientas) {
        lines.push(`    ${this.formatImport(imp)}`);
      }
    }
    lines.push('}');
    lines.push('');

    // 3. CAJA { ... }
    lines.push('CAJA {');
    for (const v of ast.caja) {
      lines.push(`    ${this.formatVariableDeclaration(v)}`);
    }
    lines.push('}');
    lines.push('');

    // 4. PLANOS (optional subroutines)
    if (ast.planos && ast.planos.length > 0) {
      for (const plano of ast.planos) {
        lines.push(this.formatPlano(plano));
        lines.push('');
      }
    }

    // 5. MONTAJE { ... }
    lines.push('MONTAJE {');
    for (let i = 0; i < ast.montaje.length; i++) {
      const paso = ast.montaje[i];
      lines.push(`    PASO ${paso.stepNumber}: "${paso.description}" {`);
      for (const stmt of paso.body) {
        lines.push(`        ${this.formatStatement(stmt, '        ')}`);
      }
      lines.push('    }');
      if (i < ast.montaje.length - 1) {
        lines.push('');
      }
    }
    lines.push('}');
    lines.push('');

    // 6. TERMINADO <retorno>;
    lines.push(`TERMINADO ${this.formatExpression(ast.terminado)};`);

    return lines.join('\n');
  }

  private static formatImport(imp: ImportNode): string {
    let str = 'TRAER ';
    if (imp.importType === 'CATALOG') {
      str += `"${imp.target}" DEL_CATALOGO`;
    } else if (imp.importType === 'LOCAL') {
      str += imp.target; // contains "name DESDE 'path'"
    } else {
      str += imp.target;
    }

    if (imp.alias) {
      str += ` COMO ${imp.alias}`;
    }

    return str;
  }

  private static formatVariableDeclaration(v: VariableDeclarationNode): string {
    const typeStr = v.elementType ? `${v.varType}[${v.elementType}]` : v.varType;
    return `${typeStr} ${v.name} = ${this.formatExpression(v.initialValue)}`;
  }

  private static formatPlano(plano: PlanoNode): string {
    const exp = plano.exported ? 'EXPORTAR ' : '';
    const params = plano.params.map(p => `${p.paramType} ${p.name}`).join(', ');
    const ret = plano.returnType !== 'HUECO' ? ` -> ${plano.returnType}` : '';
    const lines = [`${exp}PLANO ${plano.name}(${params})${ret} {`];
    for (const stmt of plano.body) {
      lines.push(`    ${this.formatStatement(stmt, '    ')}`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private static formatStatement(stmt: StatementNode, indent: string): string {
    switch (stmt.type) {
      case 'Assignment':
        return `${stmt.target} = ${this.formatExpression(stmt.value)}`;

      case 'ExpressionStatement':
        return this.formatExpression(stmt.expression);

      case 'Si': {
        let res = `SI ${this.formatExpression(stmt.condition)} {\n`;
        for (const s of stmt.consequent) {
          res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
        }
        if (stmt.alternate && stmt.alternate.length > 0) {
          res += `${indent}} SINO {\n`;
          for (const s of stmt.alternate) {
            res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
          }
        }
        res += `${indent}}`;
        return res;
      }

      case 'Repetir': {
        let res = `REPETIR ${this.formatExpression(stmt.count)} VECES {\n`;
        for (const s of stmt.body) {
          res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
        }
        res += `${indent}}`;
        return res;
      }

      case 'MientrasAjuste': {
        let res = `MIENTRAS_AJUSTE ${this.formatExpression(stmt.condition)} {\n`;
        for (const s of stmt.body) {
          res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
        }
        res += `${indent}}`;
        return res;
      }

      case 'PorCada': {
        let res = `POR_CADA ${stmt.item} EN ${this.formatExpression(stmt.collection)} {\n`;
        for (const s of stmt.body) {
          res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
        }
        res += `${indent}}`;
        return res;
      }

      case 'EntreDos': {
        let res = `ENTRE_DOS {\n`;
        for (const s of stmt.body) {
          res += `${indent}    ${this.formatStatement(s, indent + '    ')}\n`;
        }
        res += `${indent}}`;
        return res;
      }

      case 'Terminado':
        return `TERMINADO ${this.formatExpression(stmt.value)}`;

      default:
        return '// Statement';
    }
  }

  private static formatExpression(expr: ExpressionNode): string {
    if (!expr) return 'FALTANTE';

    switch (expr.type) {
      case 'Literal':
        if (expr.valueType === 'TABLERO') return `"${expr.value}"`;
        if (expr.valueType === 'ENCAJE') return expr.value ? 'AJUSTA' : 'SUELTO';
        if (expr.valueType === 'FALTANTE') return 'FALTANTE';
        return String(expr.value);

      case 'Identifier':
        return expr.name;

      case 'ArrayLiteral':
        return `[${expr.elements.map(e => this.formatExpression(e)).join(', ')}]`;

      case 'BinaryExpression':
        return `${this.formatExpression(expr.left)} ${expr.operator} ${this.formatExpression(expr.right)}`;

      case 'UnaryExpression':
        return `${expr.operator} ${this.formatExpression(expr.argument)}`;

      case 'CallExpression':
        return `${expr.callee}(${expr.args.map(a => this.formatExpression(a)).join(', ')})`;

      case 'MemberCallExpression':
        return `${expr.object}.${expr.method}(${expr.args.map(a => this.formatExpression(a)).join(', ')})`;

      default:
        return 'FALTANTE';
    }
  }
}
