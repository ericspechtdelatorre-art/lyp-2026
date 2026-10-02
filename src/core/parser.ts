// ============================================================================
// IKEALang v1.1 - Recursive Descent AST Parser
// ============================================================================

import { Token, TokenType } from './lexer.ts';
import {
  ProgramNode,
  ImportNode,
  VariableDeclarationNode,
  PlanoNode,
  PasoNode,
  StatementNode,
  ExpressionNode,
  IkeaType,
  BinaryOperator,
  Diagnostic,
  SourceLocation,
} from './types.ts';

export class Parser {
  private tokens: Token[];
  private current = 0;
  public diagnostics: Diagnostic[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): { ast: ProgramNode | null; diagnostics: Diagnostic[] } {
    this.diagnostics = [];
    this.current = 0;

    // Gracefully handle empty or comment-only files
    if (this.tokens.length <= 1 || (this.tokens.length === 2 && this.tokens[0].type === 'EOF')) {
      return {
        ast: null,
        diagnostics: [
          {
            id: 'info-empty-file',
            code: 'INFO',
            message: 'Archivo vacío. Comienza definiendo tu mueble con: MUEBLE <Nombre>',
            severity: 'info',
            line: 1,
            column: 1,
            mascotHint: '¡Caja recién abierta! Escribe MUEBLE NombreMueble o pulsa en insertar kit para empezar.',
            quickFixSuggestion: 'MUEBLE MiMueble\n\nHERRAMIENTAS {\n    TRAER IMPRESORA\n}\n\nCAJA {\n    TABLERO estructura = "Base"\n}\n\nMONTAJE {\n    PASO 1: "Iniciar montaje" {\n        IMPRESORA.ESCRIBIR("Montando " UNIR estructura)\n    }\n}\n\nTERMINADO estructura;\n',
          },
        ],
      };
    }

    try {
      const ast = this.parseProgram();
      return { ast, diagnostics: this.diagnostics };
    } catch (err: any) {
      if (!this.diagnostics.some(d => d.code === 'SINTAXIS')) {
        this.addError('SINTAXIS', err.message || 'Error de sintaxis desconocido', this.peek());
      }
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseProgram(): ProgramNode {
    const loc = this.getLoc();

    // 1. MUEBLE <Nombre>
    if (!this.check('MUEBLE')) {
      this.addError('SINTAXIS', 'Todo programa IkeaLang debe comenzar con la declaración: MUEBLE <Nombre>', this.peek());
    }
    this.consume('MUEBLE', 'Se esperaba palabra clave MUEBLE');
    const muebleName = this.consumeIdentifierOrString('Nombre del mueble esperado');

    let herramientas: ImportNode[] = [];
    let caja: VariableDeclarationNode[] = [];
    const planos: PlanoNode[] = [];
    let montaje: PasoNode[] = [];
    let terminado: ExpressionNode = {
      type: 'Literal',
      valueType: 'HUECO',
      value: null,
      loc: this.getLoc(),
    };

    // We can accept HERRAMIENTAS, CAJA, PLANO in flexible sequence before MONTAJE
    while (!this.isAtEnd() && !this.check('MONTAJE') && !this.check('TERMINADO')) {
      if (this.check('HERRAMIENTAS')) {
        herramientas = this.parseHerramientas();
      } else if (this.check('CAJA')) {
        caja = this.parseCaja();
      } else if (this.check('EXPORTAR') || this.check('PLANO')) {
        planos.push(this.parsePlano());
      } else {
        // Unknown token before MONTAJE
        this.addError('SINTAXIS', `Bloque inesperado '${this.peek().value}'. Se esperaba HERRAMIENTAS, CAJA o MONTAJE.`, this.peek());
        this.advance();
      }
    }

    // 2. MONTAJE { ... }
    if (this.check('MONTAJE')) {
      montaje = this.parseMontaje();
    } else {
      this.addError('SINTAXIS', 'Falta el bloque obligatorio MONTAJE { ... }', this.peek());
    }

    // 3. TERMINADO <retorno>;
    if (this.check('TERMINADO')) {
      this.advance(); // consume TERMINADO
      terminado = this.parseExpression();
      if (this.check('SEMICOLON')) {
        this.advance();
      }
    } else {
      this.addError('SINTAXIS', 'Falta la declaración final de entrega: TERMINADO <retorno>;', this.peek());
    }

    return {
      type: 'Program',
      mueble: muebleName,
      herramientas,
      caja,
      planos,
      montaje,
      terminado,
      loc,
    };
  }

  // HERRAMIENTAS { ... }
  private parseHerramientas(): ImportNode[] {
    const imports: ImportNode[] = [];
    this.consume('HERRAMIENTAS', 'Se esperaba HERRAMIENTAS');
    this.consume('LBRACE', "Se esperaba '{' tras HERRAMIENTAS");

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.check('TRAER')) {
        imports.push(this.parseImport());
      } else if (this.check('SEMICOLON')) {
        this.advance();
      } else {
        this.addError('SINTAXIS', `Directiva no válida en HERRAMIENTAS: '${this.peek().value}'. Use TRAER.`, this.peek());
        this.advance();
      }
    }

    this.consume('RBRACE', "Se esperaba '}' al cerrar HERRAMIENTAS");
    return imports;
  }

  private parseImport(): ImportNode {
    const loc = this.getLoc();
    this.consume('TRAER', 'Se esperaba TRAER');

    let target = '';
    let importType: 'NATIVE' | 'CATALOG' | 'LOCAL' = 'NATIVE';
    let alias: string | undefined;

    if (this.check('STRING_LITERAL')) {
      target = this.advance().value;
      if (this.check('DEL_CATALOGO')) {
        this.advance();
        importType = 'CATALOG';
      }
    } else {
      target = this.consumeIdentifierOrString('Identificador o módulo esperado tras TRAER');
      if (this.check('DESDE')) {
        this.advance();
        const pathToken = this.consume('STRING_LITERAL', "Se esperaba ruta entre comillas tras 'DESDE'");
        target = `${target} DESDE ${pathToken.value}`;
        importType = 'LOCAL';
      }
    }

    if (this.check('COMO')) {
      this.advance();
      alias = this.consumeIdentifierOrString('Nombre de alias esperado tras COMO');
    }

    if (this.check('SEMICOLON')) {
      this.advance();
    }

    return {
      type: 'Import',
      target,
      importType,
      alias,
      loc,
    };
  }

  // CAJA { ... }
  private parseCaja(): VariableDeclarationNode[] {
    const declarations: VariableDeclarationNode[] = [];
    this.consume('CAJA', 'Se esperaba CAJA');
    this.consume('LBRACE', "Se esperaba '{' tras CAJA");

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.isTypeToken(this.peek())) {
        declarations.push(this.parseVariableDeclaration());
      } else if (this.check('SEMICOLON')) {
        this.advance();
      } else {
        this.addError('SINTAXIS', `Declaración no válida en CAJA: '${this.peek().value}'. Debe iniciar con un tipo (TORNILLO, TABLERO, ENCAJE, CAJON).`, this.peek());
        this.advance();
      }
    }

    this.consume('RBRACE', "Se esperaba '}' al cerrar CAJA");
    return declarations;
  }

  private parseVariableDeclaration(): VariableDeclarationNode {
    const loc = this.getLoc();
    const typeToken = this.advance();
    const varType = this.tokenToType(typeToken.type);
    let elementType: IkeaType | undefined;

    // Check for CAJON[T]
    if (varType === 'CAJON' && this.check('LBRACKET')) {
      this.advance();
      const elToken = this.advance();
      elementType = this.tokenToType(elToken.type);
      this.consume('RBRACKET', "Se esperaba ']'");
    }

    const varName = this.consumeIdentifierOrString('Nombre de variable esperado');

    let initialValue: ExpressionNode = {
      type: 'Literal',
      valueType: varType,
      value: varType === 'TORNILLO' ? 0 : varType === 'TABLERO' ? '' : varType === 'ENCAJE' ? false : null,
      loc: this.getLoc(),
    };

    if (this.check('COLOCAR')) {
      this.advance(); // = or COLOCAR
      initialValue = this.parseExpression();
    }

    if (this.check('SEMICOLON')) {
      this.advance();
    }

    return {
      type: 'VariableDeclaration',
      varType,
      elementType,
      name: varName,
      initialValue,
      loc,
    };
  }

  // PLANO <nombre>(...) -> <tipo> { ... }
  private parsePlano(): PlanoNode {
    const loc = this.getLoc();
    let exported = false;
    if (this.check('EXPORTAR')) {
      exported = true;
      this.advance();
    }

    this.consume('PLANO', 'Se esperaba PLANO');
    const name = this.consumeIdentifierOrString('Nombre del plano esperado');
    this.consume('LPAREN', "Se esperaba '('");

    const params: { name: string; paramType: IkeaType }[] = [];
    while (!this.check('RPAREN') && !this.isAtEnd()) {
      const pTypeToken = this.advance();
      const pType = this.tokenToType(pTypeToken.type);
      const pName = this.consumeIdentifierOrString('Nombre de parámetro esperado');
      params.push({ name: pName, paramType: pType });
      if (this.check('COMMA')) this.advance();
    }
    this.consume('RPAREN', "Se esperaba ')'");

    let returnType: IkeaType = 'HUECO';
    if (this.check('ARROW')) {
      this.advance();
      returnType = this.tokenToType(this.advance().type);
    }

    this.consume('LBRACE', "Se esperaba '{' en cuerpo de PLANO");
    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' al cerrar PLANO");

    return {
      type: 'Plano',
      exported,
      name,
      params,
      returnType,
      body,
      loc,
    };
  }

  // MONTAJE { ... }
  private parseMontaje(): PasoNode[] {
    const pasos: PasoNode[] = [];
    this.consume('MONTAJE', 'Se esperaba MONTAJE');
    this.consume('LBRACE', "Se esperaba '{' tras MONTAJE");

    let expectedStep = 1;
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.check('PASO')) {
        const paso = this.parsePaso();
        if (paso.stepNumber !== expectedStep) {
          this.addWarning('SINTAXIS', `Paso no correlativo: Se encontró PASO ${paso.stepNumber}, se esperaba PASO ${expectedStep}`, paso.loc);
        }
        expectedStep = paso.stepNumber + 1;
        pasos.push(paso);
      } else {
        this.addError('SINTAXIS', `Dentro de MONTAJE todo código debe residir en un 'PASO <n>: "Descripción" { ... }'. Se encontró '${this.peek().value}'.`, this.peek());
        this.advance();
      }
    }

    this.consume('RBRACE', "Se esperaba '}' al cerrar MONTAJE");
    return pasos;
  }

  // PASO <n>: "<desc>" { ... }
  private parsePaso(): PasoNode {
    const loc = this.getLoc();
    this.consume('PASO', 'Se esperaba PASO');

    let stepNumber = 1;
    if (this.check('NUMERIC_LITERAL')) {
      stepNumber = parseInt(this.advance().value, 10);
    } else {
      this.addError('SINTAXIS', 'Número de paso esperado (ej: PASO 1: "...")', this.peek());
    }

    if (this.check('COLON')) {
      this.advance();
    }

    let description = `Paso ${stepNumber}`;
    if (this.check('STRING_LITERAL')) {
      description = this.advance().value;
    }

    this.consume('LBRACE', "Se esperaba '{' al iniciar PASO");
    const body: StatementNode[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }

    this.consume('RBRACE', "Se esperaba '}' al cerrar PASO");

    return {
      type: 'Paso',
      stepNumber,
      description,
      body,
      loc,
    };
  }

  // Statements
  private parseStatement(): StatementNode {
    const loc = this.getLoc();

    // Local variable declaration inside step or block
    if (this.isTypeToken(this.peek())) {
      const decl = this.parseVariableDeclaration();
      return {
        type: 'Assignment',
        target: decl.name,
        value: decl.initialValue,
        loc,
      };
    }

    // SI
    if (this.check('SI')) {
      return this.parseSi();
    }

    // REPETIR <n> VECES { ... }
    if (this.check('REPETIR')) {
      return this.parseRepetir();
    }

    // MIENTRAS_AJUSTE (<cond>) { ... }
    if (this.check('MIENTRAS_AJUSTE')) {
      return this.parseMientrasAjuste();
    }

    // POR_CADA <item> EN <cajon> { ... }
    if (this.check('POR_CADA')) {
      return this.parsePorCada();
    }

    // ENTRE_DOS { ... }
    if (this.check('ENTRE_DOS')) {
      return this.parseEntreDos();
    }

    // TERMINADO
    if (this.check('TERMINADO')) {
      this.advance();
      const val = this.parseExpression();
      if (this.check('SEMICOLON')) this.advance();
      return { type: 'Terminado', value: val, loc };
    }

    // Assignment or Expression Statement
    // e.g. "x = 5", "cajon.UNIR(...)", "IMPRESORA.ESCRIBIR(...)", "AVISO(...)"
    const expr = this.parseExpression();

    // Check if it's an assignment: target = expr
    if (expr.type === 'Identifier' && this.check('COLOCAR')) {
      this.advance(); // consume =
      const val = this.parseExpression();
      if (this.check('SEMICOLON')) this.advance();
      return {
        type: 'Assignment',
        target: expr.name,
        value: val,
        loc,
      };
    }

    if (this.check('SEMICOLON')) {
      this.advance();
    }

    return {
      type: 'ExpressionStatement',
      expression: expr,
      loc,
    };
  }

  // SI <cond> { ... } SINO { ... }
  private parseSi(): StatementNode {
    const loc = this.getLoc();
    this.consume('SI', 'Se esperaba SI');

    const condition = this.parseExpression();
    this.consume('LBRACE', "Se esperaba '{' tras condición SI");

    const consequent: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      consequent.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' tras bloque SI");

    let alternate: StatementNode[] | undefined;
    if (this.check('SINO_SI')) {
      this.advance();
      alternate = [this.parseSi()];
    } else if (this.check('SINO')) {
      this.advance();
      this.consume('LBRACE', "Se esperaba '{' tras SINO");
      alternate = [];
      while (!this.check('RBRACE') && !this.isAtEnd()) {
        alternate.push(this.parseStatement());
      }
      this.consume('RBRACE', "Se esperaba '}' tras bloque SINO");
    }

    return {
      type: 'Si',
      condition,
      consequent,
      alternate,
      loc,
    };
  }

  // REPETIR <n> VECES { ... }
  private parseRepetir(): StatementNode {
    const loc = this.getLoc();
    this.consume('REPETIR', 'Se esperaba REPETIR');
    const count = this.parseExpression();

    if (this.check('VECES')) {
      this.advance();
    }

    this.consume('LBRACE', "Se esperaba '{' tras REPETIR ... VECES");
    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' al cerrar REPETIR");

    return {
      type: 'Repetir',
      count,
      body,
      loc,
    };
  }

  // MIENTRAS_AJUSTE (<cond>) { ... }
  private parseMientrasAjuste(): StatementNode {
    const loc = this.getLoc();
    this.consume('MIENTRAS_AJUSTE', 'Se esperaba MIENTRAS_AJUSTE');

    let condition: ExpressionNode;
    if (this.check('LPAREN')) {
      this.advance();
      condition = this.parseExpression();
      this.consume('RPAREN', "Se esperaba ')' tras condición de MIENTRAS_AJUSTE");
    } else {
      condition = this.parseExpression();
    }

    this.consume('LBRACE', "Se esperaba '{' en bloque MIENTRAS_AJUSTE");
    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' al cerrar MIENTRAS_AJUSTE");

    return {
      type: 'MientrasAjuste',
      condition,
      body,
      loc,
    };
  }

  // POR_CADA <item> EN <cajon> { ... }
  private parsePorCada(): StatementNode {
    const loc = this.getLoc();
    this.consume('POR_CADA', 'Se esperaba POR_CADA');
    const item = this.consumeIdentifierOrString('Nombre de variable iteradora esperado');
    this.consume('EN', "Se esperaba 'EN' en POR_CADA");
    const collection = this.parseExpression();

    this.consume('LBRACE', "Se esperaba '{' en cuerpo de POR_CADA");
    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' al cerrar POR_CADA");

    return {
      type: 'PorCada',
      item,
      collection,
      body,
      loc,
    };
  }

  // ENTRE_DOS { ... }
  private parseEntreDos(): StatementNode {
    const loc = this.getLoc();
    this.consume('ENTRE_DOS', 'Se esperaba ENTRE_DOS');
    this.consume('LBRACE', "Se esperaba '{' tras ENTRE_DOS");

    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Se esperaba '}' al cerrar ENTRE_DOS");

    return {
      type: 'EntreDos',
      body,
      loc,
    };
  }

  // Expressions (Precedence: Logical -> Relational -> Additive -> Multiplicative -> Unary -> Primary)
  public parseExpression(): ExpressionNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ExpressionNode {
    let expr = this.parseLogicalAnd();

    while (this.check('O_BIEN')) {
      this.advance();
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpression',
        operator: 'O_BIEN',
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseLogicalAnd(): ExpressionNode {
    let expr = this.parseEquality();

    while (this.check('Y_TAMBIEN')) {
      this.advance();
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        operator: 'Y_TAMBIEN',
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseEquality(): ExpressionNode {
    let expr = this.parseRelational();

    while (this.check('ENCAJA') || this.check('NO_ENCAJA')) {
      const opToken = this.advance();
      const op: BinaryOperator = opToken.value === '==' ? 'ENCAJA' : opToken.value === '!=' ? 'NO_ENCAJA' : opToken.value as BinaryOperator;
      const right = this.parseRelational();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseRelational(): ExpressionNode {
    let expr = this.parseAdditive();

    while (this.check('MAS_LARGO') || this.check('MAS_CORTO')) {
      const opToken = this.advance();
      const op: BinaryOperator = opToken.value === '>' ? 'MAS_LARGO' : opToken.value === '<' ? 'MAS_CORTO' : opToken.value as BinaryOperator;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseAdditive(): ExpressionNode {
    let expr = this.parseMultiplicative();

    while (this.check('UNIR') || this.check('RETIRAR')) {
      const opToken = this.advance();
      const op: BinaryOperator = opToken.value === '+' ? 'UNIR' : opToken.value === '-' ? 'RETIRAR' : opToken.value as BinaryOperator;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseMultiplicative(): ExpressionNode {
    let expr = this.parseUnary();

    while (this.check('DUPLICAR') || this.check('SECCIONAR') || this.check('RESTO')) {
      const opToken = this.advance();
      const op: BinaryOperator = opToken.value === '*' ? 'DUPLICAR' : opToken.value === '/' ? 'SECCIONAR' : opToken.value === '%' ? 'RESTO' : opToken.value as BinaryOperator;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: expr.loc,
      };
    }

    return expr;
  }

  private parseUnary(): ExpressionNode {
    if (this.check('INVERTIR')) {
      const loc = this.getLoc();
      this.advance();
      const arg = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: 'INVERTIR',
        argument: arg,
        loc,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const loc = this.getLoc();

    // Grouping (expr)
    if (this.check('LPAREN')) {
      this.advance();
      const expr = this.parseExpression();
      this.consume('RPAREN', "Se esperaba ')' tras expresión");
      return expr;
    }

    // Array literal [a, b, c]
    if (this.check('LBRACKET')) {
      this.advance();
      const elements: ExpressionNode[] = [];
      while (!this.check('RBRACKET') && !this.isAtEnd()) {
        elements.push(this.parseExpression());
        if (this.check('COMMA')) this.advance();
      }
      this.consume('RBRACKET', "Se esperaba ']' al cerrar cajón literal");
      return {
        type: 'ArrayLiteral',
        elements,
        loc,
      };
    }

    // Number
    if (this.check('NUMERIC_LITERAL')) {
      const valStr = this.advance().value;
      return {
        type: 'Literal',
        valueType: 'TORNILLO',
        value: parseFloat(valStr),
        loc,
      };
    }

    // String
    if (this.check('STRING_LITERAL')) {
      const val = this.advance().value;
      return {
        type: 'Literal',
        valueType: 'TABLERO',
        value: val,
        loc,
      };
    }

    // Booleans
    if (this.check('BOOL_LITERAL')) {
      const val = this.advance().value === 'AJUSTA';
      return {
        type: 'Literal',
        valueType: 'ENCAJE',
        value: val,
        loc,
      };
    }

    // Null
    if (this.check('TYPE_FALTANTE')) {
      this.advance();
      return {
        type: 'Literal',
        valueType: 'FALTANTE',
        value: null,
        loc,
      };
    }

    // Directives AVISO / VOLCAR
    if (this.check('AVISO') || this.check('VOLCAR')) {
      const directive = this.advance().value;
      this.consume('LPAREN', `Se esperaba '(' tras ${directive}`);
      const args: ExpressionNode[] = [];
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        args.push(this.parseExpression());
        if (this.check('COMMA')) this.advance();
      }
      this.consume('RPAREN', `Se esperaba ')' tras argumentos de ${directive}`);
      return {
        type: 'CallExpression',
        callee: directive,
        args,
        loc,
      };
    }

    // Identifier or Member call or Function call
    if (this.check('IDENTIFIER') || this.isToolIdentifier(this.peek())) {
      const idToken = this.advance();
      let idName = idToken.value;

      // Check for dot member call: object.method(...)
      while (this.check('DOT')) {
        this.advance(); // consume dot
        const memberToken = this.advance();
        const methodName = memberToken.value;

        if (this.check('LPAREN')) {
          this.advance();
          const args: ExpressionNode[] = [];
          while (!this.check('RPAREN') && !this.isAtEnd()) {
            args.push(this.parseExpression());
            if (this.check('COMMA')) this.advance();
          }
          this.consume('RPAREN', `Se esperaba ')' en llamada a método ${methodName}`);
          return {
            type: 'MemberCallExpression',
            object: idName,
            method: methodName,
            args,
            loc,
          };
        } else {
          // Property access
          idName = `${idName}.${methodName}`;
        }
      }

      // Standalone function call: id(...)
      if (this.check('LPAREN')) {
        this.advance();
        const args: ExpressionNode[] = [];
        while (!this.check('RPAREN') && !this.isAtEnd()) {
          args.push(this.parseExpression());
          if (this.check('COMMA')) this.advance();
        }
        this.consume('RPAREN', `Se esperaba ')' en llamada a ${idName}`);
        return {
          type: 'CallExpression',
          callee: idName,
          args,
          loc,
        };
      }

      return {
        type: 'Identifier',
        name: idName,
        loc,
      };
    }

    // Fallback for unexpected token
    const unexpected = this.peek();
    this.addError('SINTAXIS', `Símbolo o expresión inesperada: '${unexpected.value}'`, unexpected);
    this.advance();
    return {
      type: 'Literal',
      valueType: 'FALTANTE',
      value: null,
      loc,
    };
  }

  // Utilities
  private isTypeToken(token: Token): boolean {
    return token.type.startsWith('TYPE_');
  }

  private isToolIdentifier(token: Token): boolean {
    return [
      'IMPRESORA', 'MATEMATICAS', 'NIVEL_BURBUJA', 'CRONOMETRO', 'FICHEROS',
      'LLAVE_ALLEN', 'Red', 'Calc', 'Http',
    ].includes(token.value);
  }

  private tokenToType(type: TokenType): IkeaType {
    switch (type) {
      case 'TYPE_TORNILLO': return 'TORNILLO';
      case 'TYPE_TABLERO': return 'TABLERO';
      case 'TYPE_ENCAJE': return 'ENCAJE';
      case 'TYPE_CAJON': return 'CAJON';
      case 'TYPE_FALTANTE': return 'FALTANTE';
      case 'TYPE_HUECO': return 'HUECO';
      default: return 'TABLERO';
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', line: 1, column: 1, length: 0 };
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.tokens[this.current].type === 'EOF';
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) return this.advance();
    this.addError('SINTAXIS', `${errorMessage}. Se encontró '${this.peek().value}'`, this.peek());
    return this.peek();
  }

  private consumeIdentifierOrString(errorMessage: string): string {
    if (this.check('IDENTIFIER') || this.isToolIdentifier(this.peek())) {
      return this.advance().value;
    }
    if (this.check('STRING_LITERAL')) {
      return this.advance().value;
    }
    this.addError('SINTAXIS', errorMessage, this.peek());
    return 'anon';
  }

  private getLoc(): SourceLocation {
    const t = this.peek();
    return { line: t.line, column: t.column, length: t.length };
  }

  private addError(code: Diagnostic['code'], message: string, token: Token | SourceLocation) {
    this.diagnostics.push({
      id: `err-${this.diagnostics.length + 1}`,
      code,
      message,
      severity: 'error',
      line: 'line' in token ? token.line : 1,
      column: 'column' in token ? token.column : 1,
      endLine: 'line' in token ? token.line : 1,
      endColumn: 'column' in token ? token.column + (token.length || 1) : 2,
      mascotHint: '¡Vaya! Parece que una pieza no encaja en la estructura del manual.',
    });
  }

  private addWarning(code: Diagnostic['code'], message: string, loc: SourceLocation) {
    this.diagnostics.push({
      id: `warn-${this.diagnostics.length + 1}`,
      code,
      message,
      severity: 'warning',
      line: loc.line,
      column: loc.column,
      endLine: loc.line,
      endColumn: loc.column + (loc.length || 1),
      mascotHint: 'Cuidado con este detalle de montaje para asegurar la estabilidad.',
    });
  }
}
