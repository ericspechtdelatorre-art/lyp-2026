// ============================================================================
// IKEALang v1.1 - Bottom Diagnostics & Assembly Console Drawer
// ============================================================================

import React, { useState } from 'react';
import { ExecutionLog, Diagnostic } from '../core/types.ts';
import {
  Terminal,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Box,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface DiagnosticsConsoleProps {
  logs: ExecutionLog[];
  diagnostics: Diagnostic[];
  onClearLogs: () => void;
  onSelectDiagnosticLine?: (line: number) => void;
}

export const DiagnosticsConsole: React.FC<DiagnosticsConsoleProps> = ({
  logs,
  diagnostics,
  onClearLogs,
  onSelectDiagnosticLine,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'linter'>('console');

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <div className="w-full h-full flex flex-col bg-[#faf7f0] dark:bg-[#111e14] border-t border-[#d8cca8] dark:border-[#213825] overflow-hidden select-none">
      {/* Drawer Tabs Header */}
      <div className="flex items-center justify-between px-3 bg-[#eae2d0] dark:bg-[#16271c] border-b border-[#d8cca8] dark:border-[#213825] text-xs">
        <div className="flex items-center gap-1">
          {/* Tab 1: Assembly Console */}
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 transition-all ${
              activeTab === 'console'
                ? 'border-[#0058a3] dark:border-[#ffdb00] text-[#0058a3] dark:text-[#ffdb00] bg-white/60 dark:bg-[#1e3425]'
                : 'border-transparent text-[#6e5d49] dark:text-[#88a58f] hover:text-black dark:hover:text-white'
            }`}
          >
            <Terminal size={13} />
            <span>Consola del Manual ({logs.length})</span>
          </button>

          {/* Tab 2: Linter & Diagnostics */}
          <button
            onClick={() => setActiveTab('linter')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 transition-all ${
              activeTab === 'linter'
                ? 'border-[#0058a3] dark:border-[#ffdb00] text-[#0058a3] dark:text-[#ffdb00] bg-white/60 dark:bg-[#1e3425]'
                : 'border-transparent text-[#6e5d49] dark:text-[#88a58f] hover:text-black dark:hover:text-white'
            }`}
          >
            <AlertTriangle size={13} />
            <span>Reglas & Diagnósticos</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  errorCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                }`}
              >
                {errorCount + warningCount}
              </span>
            )}
          </button>
        </div>

        {/* Clear Button */}
        {activeTab === 'console' && (
          <button
            onClick={onClearLogs}
            className="p-1 text-[#7a6b57] dark:text-[#839e8b] hover:text-red-500 transition-colors"
            title="Limpiar consola"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs select-text">
        {activeTab === 'console' ? (
          <div className="space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-[#8c7b66] dark:text-[#6a8571] italic text-center py-4">
                El manual está cerrado. Pulsa "Montar Todo" o "Siguiente Paso" para ver la salida.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 leading-relaxed ${
                    log.type === 'panic'
                      ? 'text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 p-1.5 rounded'
                      : log.type === 'warning'
                      ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-1 rounded'
                      : log.type === 'step'
                      ? 'text-[#0058a3] dark:text-[#ffdb00] font-bold border-l-2 border-[#0058a3] pl-2 my-1'
                      : log.type === 'worker'
                      ? 'text-purple-600 dark:text-purple-300'
                      : 'text-[#2e2923] dark:text-[#dbe8dd]'
                  }`}
                >
                  <span className="text-[10px] text-[#8c7b66] dark:text-[#66806d] select-none whitespace-nowrap">
                    [{log.timestamp}]
                  </span>
                  <span className="flex-1 break-words">{log.message}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {diagnostics.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-emerald-700 dark:text-emerald-400 font-sans font-semibold">
                <CheckCircle2 size={18} />
                <span>
                  ¡Sin piezas sobrantes ni errores de rosca! El plano es 100% canónico.
                </span>
              </div>
            ) : (
              diagnostics.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDiagnosticLine && onSelectDiagnosticLine(d.line)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    d.severity === 'error'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 hover:border-red-400'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`font-bold uppercase tracking-wider ${
                        d.severity === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {d.code}
                    </span>
                    <span className="text-[11px] text-[#7a6b57] dark:text-[#839e8b]">
                      Línea {d.line}:{d.column}
                    </span>
                  </div>

                  <p className="text-[#2e2923] dark:text-[#e4efe6] text-xs font-sans font-medium mb-1">
                    {d.message}
                  </p>

                  {d.mascotHint && (
                    <div className="flex items-start gap-1.5 text-[11px] text-[#855e00] dark:text-[#ffdb00] font-sans bg-amber-100/50 dark:bg-[#202914] p-1.5 rounded-lg border border-amber-300/40">
                      <HelpCircle size={13} className="shrink-0 mt-0.5" />
                      <span>{d.mascotHint}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
