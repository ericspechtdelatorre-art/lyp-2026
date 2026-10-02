// ============================================================================
// IKEALang v1.1 - Virtual Assembly Interpreter & Step-by-Step Debugger
// ============================================================================

import {
  ProgramNode,
  PasoNode,
  StatementNode,
  ExpressionNode,
  ExecutionState,
  ExecutionLog,
  MemoryVariable,
} from './types.ts';

export class Interpreter {
  private program: ProgramNode;
  private state: ExecutionState;
  private onStateChange?: (state: ExecutionState) => void;

  constructor(program: ProgramNode, onStateChange?: (state: ExecutionState) => void) {
    this.program = program;
    this.onStateChange = onStateChange;
    this.state = this.initInitialState();
  }

  public getState(): ExecutionState {
    return this.state;
  }

  public reset(): ExecutionState {
    this.state = this.initInitialState();
    this.notify();
    return this.state;
  }

  private initInitialState(): ExecutionState {
    const vars: Record<string, MemoryVariable> = {};

    // Initialize CAJA variables
    for (const decl of this.program.caja) {
      const initVal = this.evalExpression(decl.initialValue, vars);
      vars[decl.name] = {
        name: decl.name,
        type: decl.varType,
        value: initVal,
        declaredInCaja: true,
        usedInMontaje: false,
      };
    }

    return {
      status: 'idle',
      currentStepIndex: 0,
      totalSteps: this.program.montaje.length,
      variables: vars,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'print',
          message: `[MANUAL DE MONTAJE INICIADO]: Mueble '${this.program.mueble}' listo para ensamblar.`,
        },
      ],
      activeWorkerLanes: 0,
    };
  }

  // Execute single PASO
  public step(): ExecutionState {
    if (this.state.status === 'completed' || this.state.status === 'error') {
      return this.state;
    }

    if (this.state.currentStepIndex >= this.program.montaje.length) {
      this.finishExecution();
      return this.state;
    }

    const currentPaso = this.program.montaje[this.state.currentStepIndex];
    this.state.status = 'running';

    this.addLog(
      'step',
      `--- INICIANDO PASO ${currentPaso.stepNumber}: "${currentPaso.description}" ---`,
      currentPaso.stepNumber
    );

    try {
      for (const stmt of currentPaso.body) {
        this.executeStatement(stmt, this.state.variables);
      }

      this.state.currentStepIndex++;

      if (this.state.currentStepIndex >= this.program.montaje.length) {
        this.finishExecution();
      } else {
        this.state.status = 'paused';
      }
    } catch (err: any) {
      this.state.status = 'error';
      this.state.error = err.message;
      this.addLog('panic', `PANICO DE MONTAJE: ${err.message}`, currentPaso.stepNumber);
    }

    this.notify();
    return this.state;
  }

  // Execute all remaining steps
  public executeAll(): ExecutionState {
    this.state.status = 'running';

    while (this.state.currentStepIndex < this.program.montaje.length && this.state.status === 'running') {
      const paso = this.program.montaje[this.state.currentStepIndex];
      this.addLog(
        'step',
        `--- PASO ${paso.stepNumber}: "${paso.description}" ---`,
        paso.stepNumber
      );

      try {
        for (const stmt of paso.body) {
          this.executeStatement(stmt, this.state.variables);
        }
        this.state.currentStepIndex++;
      } catch (err: any) {
        this.state.status = 'error';
        this.state.error = err.message;
        this.addLog('panic', `PANICO DE MONTAJE: ${err.message}`, paso.stepNumber);
        this.notify();
        return this.state;
      }
    }

    if ((this.state.status as string) !== 'error') {
      this.finishExecution();
    }

    this.notify();
    return this.state;
  }

  private finishExecution() {
    try {
      const returnVal = this.evalExpression(this.program.terminado, this.state.variables);
      this.state.returnValue = returnVal;
      this.state.status = 'completed';

      this.addLog(
        'print',
        `✓ MONTAJE COMPLETADO CON ÉXITO: Mueble '${this.program.mueble}' terminado. Resultado: ${JSON.stringify(returnVal)}`
      );
    } catch (err: any) {
      this.state.status = 'error';
      this.state.error = err.message;
      this.addLog('panic', `Error evaluando TERMINADO: ${err.message}`);
    }
  }

  private executeStatement(stmt: StatementNode, vars: Record<string, MemoryVariable>) {
    switch (stmt.type) {
      case 'Assignment': {
        const val = this.evalExpression(stmt.value, vars);
        if (vars[stmt.target]) {
          vars[stmt.target].value = val;
          vars[stmt.target].usedInMontaje = true;
        } else {
          // Local variable created during step
          vars[stmt.target] = {
            name: stmt.target,
            type: typeof val === 'number' ? 'TORNILLO' : typeof val === 'boolean' ? 'ENCAJE' : Array.isArray(val) ? 'CAJON' : 'TABLERO',
            value: val,
            declaredInCaja: false,
            usedInMontaje: true,
          };
        }
        break;
      }

      case 'ExpressionStatement':
        this.evalExpression(stmt.expression, vars);
        break;

      case 'Si': {
        const cond = this.evalExpression(stmt.condition, vars);
        if (cond) {
          for (const s of stmt.consequent) {
            this.executeStatement(s, vars);
          }
        } else if (stmt.alternate) {
          for (const s of stmt.alternate) {
            this.executeStatement(s, vars);
          }
        }
        break;
      }

      case 'Repetir': {
        const count = Number(this.evalExpression(stmt.count, vars)) || 0;
        for (let i = 0; i < count; i++) {
          for (const s of stmt.body) {
            this.executeStatement(s, vars);
          }
        }
        break;
      }

      case 'MientrasAjuste': {
        let iterations = 0;
        const maxIter = 1000;
        while (Boolean(this.evalExpression(stmt.condition, vars)) && iterations < maxIter) {
          for (const s of stmt.body) {
            this.executeStatement(s, vars);
          }
          iterations++;
        }
        if (iterations >= maxIter) {
          throw new Error('Bucle infinito detectado en MIENTRAS_AJUSTE. El tornillo gira en falso.');
        }
        break;
      }

      case 'PorCada': {
        const coll = this.evalExpression(stmt.collection, vars);
        if (Array.isArray(coll)) {
          for (const item of coll) {
            vars[stmt.item] = {
              name: stmt.item,
              type: typeof item === 'number' ? 'TORNILLO' : 'TABLERO',
              value: item,
              declaredInCaja: false,
              usedInMontaje: true,
            };
            for (const s of stmt.body) {
              this.executeStatement(s, vars);
            }
          }
        }
        break;
      }

      case 'EntreDos': {
        this.state.activeWorkerLanes += 2;
        this.addLog('worker', `[ENTRE_DOS]: Concurrencia asistida activada. 2 montadores sujetando la estructura.`);
        for (const s of stmt.body) {
          this.executeStatement(s, vars);
        }
        this.state.activeWorkerLanes -= 2;
        this.addLog('worker', `[ENTRE_DOS]: Tarea pesada finalizada con éxito.`);
        break;
      }

      case 'Terminado':
        this.state.returnValue = this.evalExpression(stmt.value, vars);
        break;
    }
  }

  private evalExpression(expr: ExpressionNode, vars: Record<string, MemoryVariable>): any {
    if (!expr) return null;

    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier': {
        if (vars[expr.name] !== undefined) {
          vars[expr.name].usedInMontaje = true;
          return vars[expr.name].value;
        }
        if (expr.name === 'AJUSTA') return true;
        if (expr.name === 'SUELTO') return false;
        if (expr.name === 'FALTANTE') return null;
        return expr.name;
      }

      case 'ArrayLiteral':
        return expr.elements.map(e => this.evalExpression(e, vars));

      case 'BinaryExpression': {
        const left = this.evalExpression(expr.left, vars);
        const right = this.evalExpression(expr.right, vars);

        switch (expr.operator) {
          case 'UNIR':
            if (Array.isArray(left)) {
              return [...left, right];
            }
            if (typeof left === 'string' || typeof right === 'string') {
              return `${left}${right}`;
            }
            return Number(left) + Number(right);

          case 'RETIRAR':
            if (Array.isArray(left)) {
              return left.filter(item => item !== right);
            }
            return Number(left) - Number(right);

          case 'DUPLICAR':
            if (typeof left === 'string' && typeof right === 'number') {
              return left.repeat(Math.max(0, Math.floor(right)));
            }
            return Number(left) * Number(right);

          case 'SECCIONAR':
            if (Number(right) === 0) {
              throw new Error('PANICO: VUELCO: División por cero. El mueble pierde apoyo en una de sus patas.');
            }
            return Number(left) / Number(right);

          case 'RESTO':
            return Number(left) % Number(right);

          case 'ENCAJA':
            return left === right;

          case 'NO_ENCAJA':
            return left !== right;

          case 'MAS_LARGO':
            return Number(left) > Number(right);

          case 'MAS_CORTO':
            return Number(left) < Number(right);

          case 'Y_TAMBIEN':
            return Boolean(left && right);

          case 'O_BIEN':
            return Boolean(left || right);

          default:
            return left;
        }
      }

      case 'UnaryExpression': {
        const arg = this.evalExpression(expr.argument, vars);
        if (expr.operator === 'INVERTIR') {
          return !arg;
        }
        return arg;
      }

      case 'CallExpression': {
        const args = expr.args.map(a => this.evalExpression(a, vars));
        if (expr.callee === 'AVISO') {
          this.addLog('warning', `AVISO: ${args.join(' ')}`);
          return null;
        }
        if (expr.callee === 'VOLCAR') {
          throw new Error(`PANICO: VOLCAR("${args.join(' ')}")`);
        }
        return null;
      }

      case 'MemberCallExpression': {
        const args = expr.args.map(a => this.evalExpression(a, vars));
        return this.executeMemberMethod(expr.object, expr.method, args, vars);
      }

      default:
        return null;
    }
  }

  private executeMemberMethod(
    object: string,
    method: string,
    args: any[],
    vars: Record<string, MemoryVariable>
  ): any {
    // 1. Tool IMPRESORA
    if (object === 'IMPRESORA') {
      if (method === 'ESCRIBIR') {
        const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        this.addLog('print', `[IMPRESORA]: ${text}`);
        return null;
      }
      if (method === 'LEER') {
        return 'Entrada_Usuario_IKEA';
      }
    }

    // 2. Tool MATEMATICAS / Calc
    if (object === 'MATEMATICAS' || object === 'Calc') {
      if (method === 'RAIZ') return Math.sqrt(args[0]);
      if (method === 'POTENCIA') return Math.pow(args[0], args[1]);
      if (method === 'REDONDEAR') return Math.round(args[0] * 100) / 100;
      if (method === 'SENO') return Math.sin(args[0]);
      if (method === 'COSENO') return Math.cos(args[0]);
      if (method === 'MINIMO') return Math.min(...args);
      if (method === 'MAXIMO') return Math.max(...args);
    }

    // 3. Tool NIVEL_BURBUJA
    if (object === 'NIVEL_BURBUJA') {
      if (method === 'ESTA_NIVELADO') return true;
      if (method === 'ANGULO') return 0.0;
    }

    // 4. Tool CRONOMETRO / Reloj
    if (object === 'CRONOMETRO' || object === 'Reloj') {
      if (method === 'ESPERAR_MILISEGUNDOS') {
        this.addLog('print', `[CRONOMETRO]: Esperando ${args[0]}ms...`);
        return true;
      }
      if (method === 'TIEMPO_TRANSCURRIDO') return 120;
    }

    // 5. Tool Red / Http
    if (object === 'Red' || object === 'Http') {
      if (method === 'GET') {
        this.addLog('print', `[RED HTTP]: Petición GET simulada a ${args[0]}`);
        return '49.99'; // Mock response
      }
      if (method === 'POST') {
        this.addLog('print', `[RED HTTP]: Enviando telemetría a ${args[0]}`);
        return 'OK';
      }
      if (method === 'DESCARGAR_CATALOGO') {
        this.addLog('print', `[RED HTTP]: Catálogo 2026 descargado con éxito (${args[0]})`);
        return 'CATALOGO_2026_OK';
      }
    }

    // 6. Submuebles locales (BisagraReforzada, PuertaVidrio, etc.)
    if (object === 'BisagraReforzada') {
      if (method === 'CREAR') return `Bisagra_${args[0]}deg`;
    }
    if (object === 'PuertaVidrio') {
      if (method === 'INSTALAR') {
        this.addLog('print', `[SUBENSAMBLAJE]: Puerta de vidrio instalada en la estructura.`);
        return true;
      }
    }

    // 7. Operations on variables (e.g. herrajes.UNIR, texto.A_TORNILLO)
    if (vars[object]) {
      const v = vars[object];
      if (Array.isArray(v.value)) {
        if (method === 'UNIR') {
          v.value.push(args[0]);
          return v.value;
        }
        if (method === 'RETIRAR') {
          v.value = v.value.filter(item => item !== args[0]);
          return v.value;
        }
        if (method === 'LONGITUD') {
          return v.value.length;
        }
      }
      if (typeof v.value === 'string') {
        if (method === 'A_TORNILLO') {
          return parseFloat(v.value) || 0;
        }
      }
    }

    return null;
  }

  private addLog(type: ExecutionLog['type'], message: string, stepNumber?: number) {
    this.state.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      stepNumber,
      type,
      message,
    });
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
