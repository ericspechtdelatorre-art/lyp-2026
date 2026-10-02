// ============================================================================
// IKEALang v1.1 - VS Code Bottom Problems & Output Panel
// ============================================================================

import React, { useState } from 'react';
import { Diagnostic, ExecutionLog } from '../core/types.ts';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface ProblemsPanelProps {
  diagnostics: Diagnostic[];
  logs: ExecutionLog[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectLine: (line: number) => void;
  onClearLogs: () => void;
  fileName: string;
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({
  diagnostics,
  logs,
  isOpen,
  onToggleOpen,
  onSelectLine,
  onClearLogs,
  fileName,
}) => {
  const [activeTab, setActiveTab] = useState<'problems' | 'output'>('problems');

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const totalCount = diagnostics.length;

  if (!isOpen) {
    return (
      <div className="h-6 bg-[#252526] border-t border-[#333333] flex items-center justify-between px-3 text-[11px] text-[#cccccc] select-none">
        <button
          onClick={onToggleOpen}
          className="flex items-center gap-2 hover:text-white"
        >
          <ChevronUp size={13} />
          <span>PROBLEMAS ({totalCount})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-48 bg-[#1e1e1e] border-t border-[#333333] flex flex-col text-[#cccccc] select-none text-xs font-sans shrink-0">
      {/* Panel Tabs Header */}
      <div className="h-8 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between px-3 text-[11px] uppercase tracking-wider font-semibold">
        <div className="flex items-center gap-1">
          {/* Tab 1: Problems */}
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-[#007acc] text-white font-bold'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <span>PROBLEMAS</span>
            {totalCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  errorCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-600 text-black'
                }`}
              >
                {totalCount}
              </span>
            )}
          </button>

          {/* Tab 2: Assembly Output */}
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'output'
                ? 'border-[#007acc] text-white font-bold'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Terminal size={12} />
            <span>SALIDA DE MONTAJE ({logs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'output' && (
            <button
              onClick={onClearLogs}
              className="p-1 text-[#858585] hover:text-white rounded"
              title="Limpiar salida"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={onToggleOpen}
            className="p-1 text-[#858585] hover:text-white rounded"
            title="Cerrar panel de problemas"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[12px] select-text">
        {activeTab === 'problems' ? (
          <div>
            {diagnostics.length === 0 ? (
              <div className="py-4 text-center text-[#858585] italic font-sans text-xs">
                No se han detectado problemas en el plano de montaje.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-[#858585] px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                  <span>🪑 {fileName}</span>
                  <span className="text-[#569cd6]">({diagnostics.length})</span>
                </div>

                {diagnostics.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onSelectLine(d.line)}
                    className="flex items-start gap-2 px-2 py-1 rounded hover:bg-[#2a2d2e] cursor-pointer group transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {d.severity === 'error' ? (
                        <AlertCircle size={14} className="text-red-500" />
                      ) : d.severity === 'warning' ? (
                        <AlertTriangle size={14} className="text-amber-500" />
                      ) : (
                        <Info size={14} className="text-blue-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-[12px]">
                          [{d.code}]
                        </span>
                        <span className="text-[#cccccc] text-[12px]">
                          {d.message}
                        </span>
                        <span className="text-[#858585] text-[11px] ml-auto font-mono">
                          [{d.line}, {d.column}]
                        </span>
                      </div>

                      {d.mascotHint && (
                        <div className="text-[11px] text-[#ffdb00] mt-0.5 font-sans">
                          💡 {d.mascotHint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="py-4 text-center text-[#858585] italic font-sans text-xs">
                No hay registros de ejecución en la consola.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`text-[12px] leading-relaxed font-mono ${
                    log.type === 'panic'
                      ? 'text-red-400 font-bold'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : log.type === 'step'
                      ? 'text-[#007acc] font-bold'
                      : 'text-[#d4d4d4]'
                  }`}
                >
                  <span className="text-[#858585] text-[11px] mr-2">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
