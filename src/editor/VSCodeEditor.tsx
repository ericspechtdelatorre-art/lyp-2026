// ============================================================================
// IKEALang v1.1 - VS Code Native Code Editor with Squiggly Underlines & Hover Peeks
// ============================================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { highlightIkeaLang } from './ikeaHighlighter.ts';
import { Diagnostic } from '../core/types.ts';
import './FoldingRulerGutter.css';
import { AlertCircle, AlertTriangle, Info, HelpCircle, Check, Sparkles } from 'lucide-react';

interface VSCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  diagnostics: Diagnostic[];
  breakpoints: number[];
  onBreakpointToggle: (line: number) => void;
  onCursorChange?: (line: number, col: number) => void;
  onApplyQuickFix?: (fix: string) => void;
  theme?: 'dark' | 'light';
}

export const VSCodeEditor: React.FC<VSCodeEditorProps> = ({
  code,
  onChange,
  diagnostics,
  breakpoints,
  onBreakpointToggle,
  onCursorChange,
  onApplyQuickFix,
  theme = 'dark',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [hoveredDiagnostic, setHoveredDiagnostic] = useState<{ diag: Diagnostic; y: number } | null>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const highlightedCode = useMemo(() => highlightIkeaLang(code), [code]);

  // Map diagnostics to lines
  const diagnosticMap = useMemo(() => {
    const map = new Map<number, Diagnostic>();
    for (const d of diagnostics) {
      if (!map.has(d.line) || d.severity === 'error') {
        map.set(d.line, d);
      }
    }
    return map;
  }, [diagnostics]);

  // Synchronize scroll between textarea, syntax overlay and gutter
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
    setHoveredDiagnostic(null);
  };

  // Track cursor position
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const textBefore = code.substring(0, pos);
    const lineList = textBefore.split('\n');
    const currentLine = lineList.length;
    const currentCol = lineList[lineList.length - 1].length + 1;
    setCursorLine(currentLine);
    setCursorCol(currentCol);
    if (onCursorChange) {
      onCursorChange(currentLine, currentCol);
    }

    // Auto-show diagnostic if cursor is on an error line
    const diagOnLine = diagnosticMap.get(currentLine);
    if (diagOnLine) {
      const lineY = (currentLine - 1) * 22 + 30 - (textareaRef.current.scrollTop || 0);
      setHoveredDiagnostic({ diag: diagOnLine, y: Math.max(10, lineY) });
    } else {
      setHoveredDiagnostic(null);
    }
  };

  // Keyboard handlers: Tab, Auto-indent, Auto-closing pairs & Clean Backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 1. Tab & Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab unindent
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        if (code.substring(lineStart, lineStart + 4) === '    ') {
          const next = code.substring(0, lineStart) + code.substring(lineStart + 4);
          onChange(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 4);
          }, 0);
        }
      } else {
        // Tab indent (4 spaces)
        const next = code.substring(0, start) + '    ' + code.substring(end);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
      return;
    }

    // 2. Enter -> Maintain previous indentation
    if (e.key === 'Enter') {
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLineText = code.substring(lineStart, start);
      const matchIndent = currentLineText.match(/^(\s+)/);
      let indent = matchIndent ? matchIndent[1] : '';

      // If line ends with '{', add 4 spaces
      const trimmedBefore = currentLineText.trim();
      const extraIndent = trimmedBefore.endsWith('{') ? '    ' : '';

      e.preventDefault();
      const insertion = '\n' + indent + extraIndent;
      const next = code.substring(0, start) + insertion + code.substring(end);
      onChange(next);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      }, 0);
      return;
    }

    // 3. Auto-close pairs: { -> {}, " -> "", ( -> (), [ -> []
    const pairs: Record<string, string> = {
      '{': '}',
      '(': ')',
      '[': ']',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const close = pairs[e.key];
      const next = code.substring(0, start) + e.key + close + code.substring(end);
      onChange(next);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }

    // 4. Clean Backspace when between paired quotes or braces
    if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = code[start - 1];
      const nextChar = code[start];
      if (
        (prevChar === '{' && nextChar === '}') ||
        (prevChar === '(' && nextChar === ')') ||
        (prevChar === '[' && nextChar === ']') ||
        (prevChar === '"' && nextChar === '"') ||
        (prevChar === "'" && nextChar === "'")
      ) {
        e.preventDefault();
        const next = code.substring(0, start - 1) + code.substring(start + 1);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1;
        }, 0);
        return;
      }
    }
  };

  return (
    <div
      className={`relative w-full h-full flex overflow-hidden font-mono text-[13px] leading-[22px] select-text ${
        theme === 'dark' ? 'bg-[#1e1e1e] text-[#d4d4d4]' : 'bg-[#ffffff] text-[#000000]'
      }`}
    >
      {/* 1. Folding Ruler Line Numbers Gutter */}
      <div
        ref={gutterRef}
        className={`w-16 shrink-0 h-full overflow-hidden select-none border-r ${
          theme === 'dark'
            ? 'bg-[#1e1e1e] border-[#2d2d2d] text-[#858585]'
            : 'bg-[#f3f3f3] border-[#e5e5e5] text-[#237893]'
        }`}
      >
        <div className="py-2.5">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isBreakpoint = breakpoints.includes(lineNum);
            const diag = diagnosticMap.get(lineNum);
            const isCurrentLine = lineNum === cursorLine;

            return (
              <div
                key={idx}
                onClick={() => onBreakpointToggle(lineNum)}
                onMouseEnter={() => {
                  if (diag) {
                    setHoveredDiagnostic({ diag, y: idx * 22 + 30 });
                  }
                }}
                className={`h-[22px] px-2 flex items-center justify-between cursor-pointer group transition-colors ${
                  isCurrentLine
                    ? theme === 'dark'
                      ? 'text-[#c6c6c6] font-bold bg-[#282828]'
                      : 'text-[#0b216f] font-bold bg-[#e8e8e8]'
                    : 'hover:bg-neutral-800/30'
                } ${
                  diag?.severity === 'error'
                    ? 'bg-red-500/15'
                    : diag?.severity === 'warning'
                    ? 'bg-amber-500/15'
                    : ''
                }`}
              >
                {/* Breakpoint dowel or Diagnostic icon */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {isBreakpoint ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-[#78350f] shadow-sm animate-pulse"
                      title="Clavija de Montaje (Breakpoint)"
                    />
                  ) : diag?.code === 'PIEZAS_SOBRANTES' ? (
                    <div
                      className="w-3.5 h-3.5 rounded-full bg-[#ffdb00] text-[#0058a3] text-[9px] font-bold flex items-center justify-center shadow-xs"
                      title={`Gubbe: ${diag.message}`}
                    >
                      ?
                    </div>
                  ) : diag?.severity === 'error' ? (
                    <AlertCircle size={13} className="text-red-500" />
                  ) : diag?.severity === 'warning' ? (
                    <AlertTriangle size={13} className="text-amber-500" />
                  ) : diag?.severity === 'info' ? (
                    <Info size={13} className="text-blue-400" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-neutral-500/40" />
                  )}
                </div>

                {/* Line number with folding ruler mm indicator */}
                <span className="text-[11px] font-mono text-right w-7">
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Editor Text Area & Syntax Overlay with Squiggly Underlines */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Syntax Highlighted HTML Background View */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 p-2.5 m-0 pointer-events-none overflow-hidden font-mono text-[13px] leading-[22px] whitespace-pre tab-4 select-none"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
        />

        {/* Error Squiggly Underlines Overlay */}
        <div className="absolute inset-0 pointer-events-none p-2.5 overflow-hidden">
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const diag = diagnosticMap.get(lineNum);
            if (!diag) return <div key={idx} className="h-[22px]" />;

            const isError = diag.severity === 'error';
            return (
              <div
                key={idx}
                className="h-[22px] flex items-center"
                style={{
                  textDecoration: isError ? 'underline wavy #f14c4c 1.5px' : 'underline wavy #cca700 1.5px',
                  backgroundColor: isError ? 'rgba(241, 76, 76, 0.08)' : 'rgba(204, 167, 0, 0.08)',
                }}
              >
                <span className="invisible whitespace-pre">{lineText || ' '}</span>
              </div>
            );
          })}
        </div>

        {/* Native Textarea Foreground - 100% Reliable Typing, Deleting, Selection */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          onSelect={updateCursorPosition}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="absolute inset-0 p-2.5 m-0 w-full h-full bg-transparent text-transparent caret-[#569cd6] dark:caret-[#ffdb00] font-mono text-[13px] leading-[22px] whitespace-pre tab-4 outline-none resize-none overflow-auto border-0 select-text z-10 selection:bg-[#264f78]/60 dark:selection:bg-[#0058a3]/50"
        />

        {/* 3. Floating Hover Diagnostic Peek Widget */}
        {hoveredDiagnostic && (
          <div
            className="absolute left-10 right-10 z-30 bg-[#252526] border border-[#454545] rounded-xl shadow-2xl p-3 text-xs font-sans text-[#cccccc] animate-in fade-in duration-100 max-w-xl"
            style={{ top: Math.min(window.innerHeight - 250, hoveredDiagnostic.y + 15) }}
          >
            <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-2">
              <div className="flex items-center gap-1.5 font-bold">
                {hoveredDiagnostic.diag.severity === 'error' ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle size={14} /> {hoveredDiagnostic.diag.code}
                  </span>
                ) : hoveredDiagnostic.diag.severity === 'warning' ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={14} /> {hoveredDiagnostic.diag.code}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Info size={14} /> {hoveredDiagnostic.diag.code}
                  </span>
                )}
                <span className="text-[#858585] text-[11px] ml-2">
                  Línea {hoveredDiagnostic.diag.line}:{hoveredDiagnostic.diag.column}
                </span>
              </div>
              <button
                onClick={() => setHoveredDiagnostic(null)}
                className="text-[#858585] hover:text-white px-1"
              >
                ✕
              </button>
            </div>

            <p className="text-white text-xs mb-2 leading-relaxed font-mono">
              {hoveredDiagnostic.diag.message}
            </p>

            {hoveredDiagnostic.diag.mascotHint && (
              <div className="flex items-start gap-2 bg-[#ffdb00]/10 border border-[#ffdb00]/30 rounded-lg p-2 text-[#ffdb00] text-[11px] mb-2 font-sans">
                <span className="text-sm">💡</span>
                <span>{hoveredDiagnostic.diag.mascotHint}</span>
              </div>
            )}

            {hoveredDiagnostic.diag.quickFixSuggestion && onApplyQuickFix && (
              <button
                onClick={() => {
                  onApplyQuickFix(hoveredDiagnostic.diag.quickFixSuggestion!);
                  setHoveredDiagnostic(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded-md font-bold text-xs shadow-sm transition-colors"
              >
                <Sparkles size={12} />
                <span>Solución rápida: {hoveredDiagnostic.diag.quickFixSuggestion}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
