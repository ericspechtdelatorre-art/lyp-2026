// ============================================================================
// IKEALang Monaco language registration (syntax, themes, autocomplete)
// ============================================================================

import type { Monaco } from '@monaco-editor/react';
import type { languages } from 'monaco-editor';

const LANGUAGE_ID = 'ikealang';

const KEYWORDS = [
  'MUEBLE', 'HERRAMIENTAS', 'CAJA', 'MONTAJE', 'TERMINADO', 'PASO', 'PLANO', 'EXPORTAR',
  'REPETIR', 'VECES', 'MIENTRAS_AJUSTE', 'POR_CADA', 'EN', 'SI', 'SINO_SI', 'SINO',
  'ENTRE_DOS', 'AVISO', 'VOLCAR',
  'TRAER', 'DEL_CATALOGO', 'DESDE', 'COMO',
] as const;

const TYPES = ['TORNILLO', 'TABLERO', 'ENCAJE', 'CAJON', 'FALTANTE', 'HUECO'] as const;

const TOOLS = [
  'IMPRESORA', 'MATEMATICAS', 'NIVEL_BURBUJA', 'CRONOMETRO', 'FICHEROS', 'LLAVE_ALLEN',
  'Red', 'Calc', 'Http',
] as const;

const OPERATORS = [
  'UNIR', 'RETIRAR', 'DUPLICAR', 'SECCIONAR', 'RESTO', 'COLOCAR',
  'ENCAJA', 'NO_ENCAJA', 'MAS_LARGO', 'MAS_CORTO', 'Y_TAMBIEN', 'O_BIEN', 'INVERTIR',
] as const;

const BOOLEANS = ['AJUSTA', 'SUELTO'] as const;

const METHOD_SUGGESTIONS: Array<{ label: string; insert: string; detail: string }> = [
  { label: 'ESCRIBIR', insert: 'ESCRIBIR(${1:"mensaje"})', detail: 'IMPRESORA.ESCRIBIR(...)' },
  { label: 'LEER', insert: 'LEER(${1:"ruta"})', detail: 'FICHEROS.LEER(...)' },
  { label: 'ESCRIBIR_FICHERO', insert: 'ESCRIBIR(${1:"ruta"}, ${2:"contenido"})', detail: 'FICHEROS.ESCRIBIR(...)' },
  { label: 'SUMAR', insert: 'SUMAR(${1:a}, ${2:b})', detail: 'MATEMATICAS.SUMAR(...)' },
  { label: 'RESTAR', insert: 'RESTAR(${1:a}, ${2:b})', detail: 'MATEMATICAS.RESTAR(...)' },
  { label: 'COMPROBAR', insert: 'COMPROBAR(${1:pieza})', detail: 'NIVEL_BURBUJA.COMPROBAR(...)' },
  { label: 'MEDIR', insert: 'MEDIR(${1:pieza})', detail: 'NIVEL_BURBUJA.MEDIR(...)' },
  { label: 'INICIAR', insert: 'INICIAR()', detail: 'CRONOMETRO.INICIAR()' },
  { label: 'PARAR', insert: 'PARAR()', detail: 'CRONOMETRO.PARAR()' },
  { label: 'APRETAR', insert: 'APRETAR(${1:tornillo})', detail: 'LLAVE_ALLEN.APRETAR(...)' },
];

let registered = false;

function wordRange(
  model: { getWordUntilPosition: (p: { lineNumber: number; column: number }) => { startColumn: number; endColumn: number } },
  position: { lineNumber: number; column: number }
) {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

function registerCompletionProvider(monaco: Monaco): void {
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ['.', ' ', '{', '"'],
    provideCompletionItems(model: any, position: any) {
      const range = wordRange(model, position);
      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.substring(0, position.column - 1);
      const Kind = monaco.languages.CompletionItemKind;
      const InsertAs = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      const suggestions: languages.CompletionItem[] = [];

      // Method completion after "OBJETO."
      const methodMatch = textBefore.match(/([A-Za-z_][\w]*)\.\s*([A-Za-z_][\w]*)?$/);
      if (methodMatch) {
        for (const m of METHOD_SUGGESTIONS) {
          suggestions.push({
            label: m.label,
            kind: Kind.Method,
            detail: m.detail,
            insertText: m.insert,
            insertTextRules: InsertAs,
            range,
          });
        }
        return { suggestions };
      }

      const pushWord = (
        label: string,
        kind: languages.CompletionItemKind,
        detail: string,
        insertText?: string
      ) => {
        suggestions.push({
          label,
          kind,
          detail,
          insertText: insertText ?? label,
          insertTextRules: insertText && insertText.includes('$') ? InsertAs : undefined,
          range,
        });
      };

      for (const k of KEYWORDS) pushWord(k, Kind.Keyword, 'Palabra clave IkeaLang');
      for (const t of TYPES) pushWord(t, Kind.TypeParameter, 'Tipo de pieza');
      for (const t of TOOLS) pushWord(t, Kind.Module, 'Herramienta / módulo');
      for (const o of OPERATORS) pushWord(o, Kind.Operator, 'Operador');
      for (const b of BOOLEANS) pushWord(b, Kind.Constant, 'Booleano');

      // Structural snippets
      suggestions.push(
        {
          label: 'kit:paso',
          kind: Kind.Snippet,
          detail: 'Plantilla PASO n',
          documentation: 'Inserta un bloque PASO numerado',
          insertText: 'PASO ${1:1}: "${2:Descripción}" {\n    ${3}\n}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:repetir',
          kind: Kind.Snippet,
          detail: 'Bucle REPETIR',
          insertText: 'REPETIR ${1:3} VECES {\n    ${2}\n}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:si',
          kind: Kind.Snippet,
          detail: 'Condicional SI / SINO',
          insertText: 'SI ${1:condicion} {\n    ${2}\n} SINO {\n    ${3}\n}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:entre_dos',
          kind: Kind.Snippet,
          detail: 'Paralelismo ENTRE_DOS',
          insertText: 'ENTRE_DOS {\n    ${1}\n} Y {\n    ${2}\n}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:traer',
          kind: Kind.Snippet,
          detail: 'Importar herramienta',
          insertText: 'TRAER ${1:IMPRESORA}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:pieza',
          kind: Kind.Snippet,
          detail: 'Declarar pieza en CAJA',
          insertText: '${1|TORNILLO,TABLERO,ENCAJE,CAJON|} ${2:nombre} = ${3:0}',
          insertTextRules: InsertAs,
          range,
        },
        {
          label: 'kit:mueble',
          kind: Kind.Snippet,
          detail: 'Esqueleto de programa',
          insertText: [
            'MUEBLE ${1:MiMueble}',
            '',
            'HERRAMIENTAS {',
            '    TRAER IMPRESORA',
            '}',
            '',
            'CAJA {',
            '    TABLERO estructura = "${2:Base}"',
            '}',
            '',
            'MONTAJE {',
            '    PASO 1: "${3:Iniciar montaje}" {',
            '        IMPRESORA.ESCRIBIR("Montando " UNIR estructura)',
            '    }',
            '}',
            '',
            'TERMINADO estructura;',
          ].join('\n'),
          insertTextRules: InsertAs,
          range,
        }
      );

      // Identifiers already in the open file (variables / tools used)
      const reserved = new Set<string>([
        ...KEYWORDS, ...TYPES, ...TOOLS, ...OPERATORS, ...BOOLEANS,
      ]);
      const seen = new Set<string>();
      const text = model.getValue();
      const idRe = /\b[A-Za-z_][\w]*\b/g;
      let match: RegExpExecArray | null;
      while ((match = idRe.exec(text)) !== null) {
        const id = match[0];
        if (reserved.has(id) || seen.has(id) || id.length < 2) continue;
        seen.add(id);
        suggestions.push({
          label: id,
          kind: Kind.Variable,
          detail: 'Identificador del archivo',
          insertText: id,
          range,
        });
      }

      return { suggestions };
    },
  });
}

export function registerIkeaLang(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: LANGUAGE_ID, extensions: ['.ikea'], aliases: ['IkeaLang', 'ikealang'] });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    defaultToken: '',
    ignoreCase: false,
    keywords: [...KEYWORDS],
    types: [...TYPES],
    tools: [...TOOLS],
    operators: [...OPERATORS],
    booleans: [...BOOLEANS],
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [
          /[A-Za-z_][\w]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@types': 'type',
              '@tools': 'tools',
              '@operators': 'operator',
              '@booleans': 'boolean',
              '@default': 'identifier',
            },
          },
        ],
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[=;:.,]/, 'delimiter'],
        [/\s+/, 'white'],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: { lineComment: '//' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /{\s*$/,
      decreaseIndentPattern: /^\s*}/,
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  });

  registerCompletionProvider(monaco);

  monaco.editor.defineTheme('ikealang-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'type', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'tools', foreground: '4FC1FF', fontStyle: 'bold' },
      { token: 'operator', foreground: 'D16969', fontStyle: 'bold' },
      { token: 'boolean', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#ffdb00',
      'editor.lineHighlightBackground': '#2a2d2e',
    },
  });

  monaco.editor.defineTheme('ikealang-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'keyword', foreground: '0058A3', fontStyle: 'bold' },
      { token: 'type', foreground: '267F99', fontStyle: 'bold' },
      { token: 'tools', foreground: '0070C1', fontStyle: 'bold' },
      { token: 'operator', foreground: 'AF00DB', fontStyle: 'bold' },
      { token: 'boolean', foreground: '0058A3', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1e1e1e',
      'editorCursor.foreground': '#0058a3',
    },
  });
}

export { LANGUAGE_ID };
