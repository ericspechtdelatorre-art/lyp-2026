// ============================================================================
// IKEALang v1.1 - Lexer / Tokenizer
// ============================================================================

export type TokenType =
  // Structural
  | 'MUEBLE' | 'HERRAMIENTAS' | 'CAJA' | 'MONTAJE' | 'TERMINADO' | 'PASO'
  | 'PLANO' | 'EXPORTAR'
  // Imports
  | 'TRAER' | 'DEL_CATALOGO' | 'DESDE' | 'COMO'
  // Types
  | 'TYPE_TORNILLO' | 'TYPE_TABLERO' | 'TYPE_ENCAJE' | 'TYPE_CAJON' | 'TYPE_FALTANTE' | 'TYPE_HUECO'
  // Control flow
  | 'REPETIR' | 'VECES' | 'MIENTRAS_AJUSTE' | 'POR_CADA' | 'EN'
  | 'SI' | 'SINO_SI' | 'SINO' | 'ENTRE_DOS'
  // Builtin directives
  | 'AVISO' | 'VOLCAR'
  // Operators
  | 'UNIR' | 'RETIRAR' | 'DUPLICAR' | 'SECCIONAR' | 'RESTO'
  | 'COLOCAR' | 'ENCAJA' | 'NO_ENCAJA' | 'MAS_LARGO' | 'MAS_CORTO'
  | 'Y_TAMBIEN' | 'O_BIEN' | 'INVERTIR' | 'ARROW'
  // Literals
  | 'NUMERIC_LITERAL' | 'STRING_LITERAL' | 'BOOL_LITERAL' | 'NULL_LITERAL'
  // Identifiers
  | 'IDENTIFIER'
  // Punctuation
  | 'LBRACE' | 'RBRACE' | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET'
  | 'COMMA' | 'COLON' | 'SEMICOLON' | 'DOT'
  // End of file
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  length: number;
}

const KEYWORDS: Record<string, TokenType> = {
  MUEBLE: 'MUEBLE',
  HERRAMIENTAS: 'HERRAMIENTAS',
  CAJA: 'CAJA',
  MONTAJE: 'MONTAJE',
  TERMINADO: 'TERMINADO',
  PASO: 'PASO',
  PLANO: 'PLANO',
  EXPORTAR: 'EXPORTAR',
  TRAER: 'TRAER',
  DEL_CATALOGO: 'DEL_CATALOGO',
  DESDE: 'DESDE',
  COMO: 'COMO',
  TORNILLO: 'TYPE_TORNILLO',
  TABLERO: 'TYPE_TABLERO',
  ENCAJE: 'TYPE_ENCAJE',
  CAJON: 'TYPE_CAJON',
  FALTANTE: 'TYPE_FALTANTE',
  HUECO: 'TYPE_HUECO',
  REPETIR: 'REPETIR',
  VECES: 'VECES',
  MIENTRAS_AJUSTE: 'MIENTRAS_AJUSTE',
  POR_CADA: 'POR_CADA',
  EN: 'EN',
  SI: 'SI',
  SINO_SI: 'SINO_SI',
  SINO: 'SINO',
  ENTRE_DOS: 'ENTRE_DOS',
  AVISO: 'AVISO',
  VOLCAR: 'VOLCAR',
  // Named operators
  UNIR: 'UNIR',
  RETIRAR: 'RETIRAR',
  DUPLICAR: 'DUPLICAR',
  SECCIONAR: 'SECCIONAR',
  RESTO: 'RESTO',
  COLOCAR: 'COLOCAR',
  ENCAJA: 'ENCAJA',
  NO_ENCAJA: 'NO_ENCAJA',
  MAS_LARGO: 'MAS_LARGO',
  MAS_CORTO: 'MAS_CORTO',
  Y_TAMBIEN: 'Y_TAMBIEN',
  O_BIEN: 'O_BIEN',
  INVERTIR: 'INVERTIR',
  // Booleans
  AJUSTA: 'BOOL_LITERAL',
  SUELTO: 'BOOL_LITERAL',
};

export class Lexer {
  private input: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        continue;
      }

      if (char === '\n') {
        this.line++;
        this.column = 1;
        this.pos++;
        continue;
      }

      // Comments
      if (char === '/' && this.peek() === '/') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      if (char === '/' && this.peek() === '*') {
        this.advance(2);
        while (this.pos < this.input.length) {
          if (this.input[this.pos] === '*' && this.peek() === '/') {
            this.advance(2);
            break;
          }
          if (this.input[this.pos] === '\n') {
            this.line++;
            this.column = 1;
            this.pos++;
          } else {
            this.advance();
          }
        }
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      // Numbers
      if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
        this.readNumber();
        continue;
      }

      // Arrow ->
      if (char === '-' && this.peek() === '>') {
        this.addToken('ARROW', '->', 2);
        this.advance(2);
        continue;
      }

      // Symbol operators equivalent to words
      if (char === '+') {
        this.addToken('UNIR', '+', 1);
        this.advance();
        continue;
      }
      if (char === '-') {
        this.addToken('RETIRAR', '-', 1);
        this.advance();
        continue;
      }
      if (char === '*') {
        this.addToken('DUPLICAR', '*', 1);
        this.advance();
        continue;
      }
      if (char === '/' && this.peek() !== '/' && this.peek() !== '*') {
        this.addToken('SECCIONAR', '/', 1);
        this.advance();
        continue;
      }
      if (char === '%') {
        this.addToken('RESTO', '%', 1);
        this.advance();
        continue;
      }
      if (char === '=' && this.peek() === '=') {
        this.addToken('ENCAJA', '==', 2);
        this.advance(2);
        continue;
      }
      if (char === '!' && this.peek() === '=') {
        this.addToken('NO_ENCAJA', '!=', 2);
        this.advance(2);
        continue;
      }
      if (char === '=') {
        this.addToken('COLOCAR', '=', 1);
        this.advance();
        continue;
      }
      if (char === '>') {
        this.addToken('MAS_LARGO', '>', 1);
        this.advance();
        continue;
      }
      if (char === '<') {
        this.addToken('MAS_CORTO', '<', 1);
        this.advance();
        continue;
      }
      if (char === '&' && this.peek() === '&') {
        this.addToken('Y_TAMBIEN', '&&', 2);
        this.advance(2);
        continue;
      }
      if (char === '|' && this.peek() === '|') {
        this.addToken('O_BIEN', '||', 2);
        this.advance(2);
        continue;
      }
      if (char === '!') {
        this.addToken('INVERTIR', '!', 1);
        this.advance();
        continue;
      }

      // Single char punctuation
      if (char === '{') { this.addToken('LBRACE', '{', 1); this.advance(); continue; }
      if (char === '}') { this.addToken('RBRACE', '}', 1); this.advance(); continue; }
      if (char === '(') { this.addToken('LPAREN', '(', 1); this.advance(); continue; }
      if (char === ')') { this.addToken('RPAREN', ')', 1); this.advance(); continue; }
      if (char === '[') { this.addToken('LBRACKET', '[', 1); this.advance(); continue; }
      if (char === ']') { this.addToken('RBRACKET', ']', 1); this.advance(); continue; }
      if (char === ',') { this.addToken('COMMA', ',', 1); this.advance(); continue; }
      if (char === ':') { this.addToken('COLON', ':', 1); this.advance(); continue; }
      if (char === ';') { this.addToken('SEMICOLON', ';', 1); this.advance(); continue; }
      if (char === '.') { this.addToken('DOT', '.', 1); this.advance(); continue; }

      // Identifiers & keywords
      if (this.isAlpha(char) || char === '_') {
        this.readIdentifier();
        continue;
      }

      // Unknown character fallback
      this.advance();
    }

    this.tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column,
      length: 0,
    });

    return this.tokens;
  }

  private advance(n = 1) {
    this.pos += n;
    this.column += n;
  }

  private peek(offset = 1): string {
    return this.input[this.pos + offset] || '';
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= 'À' && ch <= 'ÿ');
  }

  private isAlphaNum(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch) || ch === '_';
  }

  private addToken(type: TokenType, value: string, length: number) {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
      length,
    });
  }

  private readString(quote: string) {
    const startLine = this.line;
    const startCol = this.column;
    this.advance(); // skip opening quote
    let value = '';

    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\') {
        this.advance();
        if (this.pos < this.input.length) {
          const esc = this.input[this.pos];
          if (esc === 'n') value += '\n';
          else if (esc === 't') value += '\t';
          else value += esc;
          this.advance();
        }
      } else {
        if (this.input[this.pos] === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        value += this.input[this.pos];
        this.pos++;
      }
    }

    if (this.pos < this.input.length && this.input[this.pos] === quote) {
      this.advance(); // skip closing quote
    }

    this.tokens.push({
      type: 'STRING_LITERAL',
      value,
      line: startLine,
      column: startCol,
      length: value.length + 2,
    });
  }

  private readNumber() {
    const startCol = this.column;
    let numStr = '';

    if (this.input[this.pos] === '-') {
      numStr += '-';
      this.advance();
    }

    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      numStr += this.input[this.pos];
      this.advance();
    }

    this.tokens.push({
      type: 'NUMERIC_LITERAL',
      value: numStr,
      line: this.line,
      column: startCol,
      length: numStr.length,
    });
  }

  private readIdentifier() {
    const startCol = this.column;
    let text = '';

    while (this.pos < this.input.length && this.isAlphaNum(this.input[this.pos])) {
      text += this.input[this.pos];
      this.advance();
    }

    const type = KEYWORDS[text] || 'IDENTIFIER';
    this.tokens.push({
      type,
      value: text,
      line: this.line,
      column: startCol,
      length: text.length,
    });
  }
}
