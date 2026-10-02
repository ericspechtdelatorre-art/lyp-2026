// ============================================================================
// IKEALang v1.2 - VS Code Native Code Editor (Error Lens removed; Clean editing)
// Diagnostics are exclusively displayed in the bottom "Problemas" panel
// ============================================================================

import React, { useRef, useMemo } from 'react';
import { highlightIkeaLang } from './ikeaHighlighter.ts';
import { Diagnostic } from '../core/types.ts';
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

export const VSCodeEditor: React.FC<VSCodeEditorProps> = ({
  code,
  onChange,
  breakpoints,
  onBreakpointToggle,
  onCursorChange,
  theme = 'dark',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const highlightedCode = useMemo(() => highlightIkeaLang(code), [code]);

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
  };

  // Track cursor position
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const textBefore = code.substring(0, pos);
    const lineList = textBefore.split('\n');
    const currentLine = lineList.length;
    const currentCol = lineList[lineList.length - 1].length + 1;
    if (onCursorChange) {
      onCursorChange(currentLine, currentCol);
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
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        if (code.substring(lineStart, lineStart + 4) === '    ') {
          const next = code.substring(0, lineStart) + code.substring(lineStart + 4);
          onChange(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 4);
          }, 0);
        }
      } else {
        const next = code.substring(0, start) + '    ' + code.substring(end);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
      return;
    }

    // 2. Enter with auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLineText = code.substring(lineStart, start);
      const matchIndent = currentLineText.match(/^(\s*)/);
      let indent = matchIndent ? matchIndent[1] : '';

      const trimmedBefore = currentLineText.trimEnd();
      const shouldExtraIndent = trimmedBefore.endsWith('{');
      if (shouldExtraIndent) {
        indent += '    ';
      }

      const charAfter = code.charAt(start);
      if (shouldExtraIndent && charAfter === '}') {
        const baseIndent = matchIndent ? matchIndent[1] : '';
        const insertion = '\n' + indent + '\n' + baseIndent;
        const next = code.substring(0, start) + insertion + code.substring(end);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        }, 0);
        return;
      }

      const next = code.substring(0, start) + '\n' + indent + code.substring(end);
      onChange(next);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
      }, 0);
      return;
    }

    // 3. Auto-closing brackets and quotes
    const pairs: Record<string, string> = {
      '{': '}',
      '(': ')',
      '[': ']',
      '"': '"',
    };

    if (pairs[e.key] && start === end) {
      const closeChar = pairs[e.key];
      const nextChar = code.charAt(start);
      if (e.key === '"' && nextChar === '"') {
        e.preventDefault();
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        return;
      }
      e.preventDefault();
      const next = code.substring(0, start) + e.key + closeChar + code.substring(end);
      onChange(next);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }

    // 4. Overtype closing characters
    if ((e.key === '}' || e.key === ')' || e.key === ']') && start === end) {
      if (code.charAt(start) === e.key) {
        e.preventDefault();
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        return;
      }
    }

    // 5. Backspace deleting empty pairs
    if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = code.charAt(start - 1);
      const nextChar = code.charAt(start);
      if (
        (prevChar === '{' && nextChar === '}') ||
        (prevChar === '(' && nextChar === ')') ||
        (prevChar === '[' && nextChar === ']') ||
        (prevChar === '"' && nextChar === '"')
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
      className={`relative w-full h-full flex overflow-hidden font-mono text-[13px] leading-[22px] ${
        theme === 'dark' ? 'bg-[#1e1e1e] text-[#d4d4d4]' : 'bg-[#ffffff] text-[#1e1e1e]'
      }`}
    >
      {/* 1. Folding Carpenter Ruler Gutter & Breakpoints */}
      <div
        ref={gutterRef}
        className="w-14 select-none shrink-0 overflow-hidden bg-[#252526] text-[#858585] border-r border-[#333333] z-20 py-2.5 font-mono text-[11px]"
      >
        <div className="flex flex-col">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isBreakpoint = breakpoints.includes(lineNum);
            const isMmTick = lineNum % 5 === 0;

            return (
              <div
                key={idx}
                onClick={() => onBreakpointToggle(lineNum)}
                className={`h-[22px] flex items-center justify-between px-1 cursor-pointer group hover:bg-[#333333]/50 ${
                  isMmTick ? 'ruler-tick-major' : 'ruler-tick-minor'
                }`}
              >
                {/* Breakpoint wooden dowel */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {isBreakpoint ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-[#78350f] shadow-sm animate-pulse"
                      title="Clavija de Montaje (Breakpoint)"
                    />
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

      {/* 2. Editor Text Area & Syntax Overlay (No error lens overlays) */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Syntax Highlighted HTML Background View */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 p-2.5 m-0 pointer-events-none overflow-hidden font-mono text-[13px] leading-[22px] whitespace-pre tab-4 select-none"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
        />

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
      </div>
    </div>
  );
};
