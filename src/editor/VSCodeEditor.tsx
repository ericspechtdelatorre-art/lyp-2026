// ============================================================================
// IKEALang — Monaco Editor (VS Code engine) with breakpoints & diagnostics
// ============================================================================

import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { Diagnostic } from '../core/types.ts';
import { registerIkeaLang, LANGUAGE_ID } from './monacoIkeaLang.ts';
import './FoldingRulerGutter.css';

interface VSCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  diagnostics?: Diagnostic[];
  breakpoints: number[];
  onBreakpointToggle: (line: number) => void;
  onCursorChange?: (line: number, col: number) => void;
  onApplyQuickFix?: (fix: string) => void;
  theme?: 'dark' | 'light';
}

const severityToMonaco = (severity: Diagnostic['severity']) => {
  // Monaco MarkerSeverity: Error=8, Warning=4, Info=2, Hint=1
  if (severity === 'error') return 8;
  if (severity === 'warning') return 4;
  return 2;
};

export const VSCodeEditor: React.FC<VSCodeEditorProps> = ({
  code,
  onChange,
  diagnostics = [],
  breakpoints,
  onBreakpointToggle,
  onCursorChange,
  theme = 'dark',
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const breakpointsRef = useRef(breakpoints);
  breakpointsRef.current = breakpoints;

  const applyBreakpointDecorations = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const next = breakpointsRef.current.map((line) => ({
      range: {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: 1,
      },
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'ikea-breakpoint-glyph',
        glyphMarginHoverMessage: { value: 'Clavija de Montaje (Breakpoint)' },
      },
    }));
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, next as MonacoEditor.IModelDeltaDecoration[]);
  }, []);

  const applyDiagnostics = useCallback(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;
    const model = ed.getModel();
    if (!model) return;

    const markers = diagnostics.map((d) => ({
      startLineNumber: d.line || 1,
      startColumn: d.column || 1,
      endLineNumber: d.line || 1,
      endColumn: (d.column || 1) + 1,
      message: `[${d.code}] ${d.message}`,
      severity: severityToMonaco(d.severity),
    }));

    monaco.editor.setModelMarkers(model, 'ikealang', markers);
  }, [diagnostics]);

  useEffect(() => {
    applyBreakpointDecorations();
  }, [breakpoints, applyBreakpointDecorations]);

  useEffect(() => {
    applyDiagnostics();
  }, [applyDiagnostics]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerIkeaLang(monaco);
    monaco.editor.setTheme(theme === 'dark' ? 'ikealang-dark' : 'ikealang-light');

    // Click glyph margin to toggle breakpoints
    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line) onBreakpointToggle(line);
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    applyBreakpointDecorations();
    applyDiagnostics();
    editor.focus();
  };

  const handleChange: OnChange = (value) => {
    onChange(value ?? '');
  };

  return (
    <div className="relative w-full h-full overflow-hidden ikea-monaco-host">
      <style>{`
        .ikea-monaco-host .monaco-editor .margin-view-overlays .ikea-breakpoint-glyph {
          background: radial-gradient(circle at center, #f59e0b 55%, #78350f 100%);
          border-radius: 50%;
          width: 8px !important;
          height: 8px !important;
          margin-left: 4px;
          margin-top: 4px;
          box-shadow: 0 0 3px rgba(245, 158, 11, 0.55);
        }
        .ikea-monaco-host .monaco-editor .margin-view-overlays .line-numbers {
          font-size: 10px !important;
          line-height: 20px !important;
          letter-spacing: -0.02em;
        }
        .ikea-monaco-host .monaco-editor,
        .ikea-monaco-host .monaco-editor .overflow-guard {
          border-radius: 0;
        }
      `}</style>
      <Editor
        height="100%"
        width="100%"
        language={LANGUAGE_ID}
        theme={theme === 'dark' ? 'ikealang-dark' : 'ikealang-light'}
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        beforeMount={registerIkeaLang}
        loading={
          <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] text-[#858585] font-mono text-sm">
            Cargando Monaco Editor…
          </div>
        }
        options={{
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: true, scale: 1 },
          glyphMargin: true,
          lineNumbers: 'on',
          lineNumbersMinChars: 2,
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'off',
          folding: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showWords: true,
            preview: true,
            insertMode: 'replace',
          },
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'off',
          snippetSuggestions: 'top',
          formatOnPaste: false,
          formatOnType: false,
        }}
      />
    </div>
  );
};
