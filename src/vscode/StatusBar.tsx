// ============================================================================
// IKEALang v1.1 - VS Code Bottom Status Bar
// ============================================================================

import React from 'react';
import { Diagnostic, ExecutionState } from '../core/types.ts';
import { WorkspaceMode } from '../components/Header.tsx';
import {
  GitBranch,
  XCircle,
  AlertTriangle,
  Play,
  ExternalLink,
  CheckCircle,
  Bell,
} from 'lucide-react';

interface StatusBarProps {
  diagnostics: Diagnostic[];
  executionState: ExecutionState;
  onOpenInterpreter: () => void;
  currentMode: WorkspaceMode;
  cursorLine: number;
  cursorCol: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  diagnostics,
  executionState,
  onOpenInterpreter,
  currentMode,
  cursorLine,
  cursorCol,
}) => {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-sans select-none z-30 shrink-0 font-medium">
      {/* Left Status Items */}
      <div className="flex items-center gap-3">
        {/* Git Branch */}
        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <GitBranch size={12} />
          <span>main*</span>
        </div>

        {/* Errors & Warnings */}
        <div className="flex items-center gap-2 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-mono">
          <span className="flex items-center gap-1">
            <XCircle size={12} /> {errorCount}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={12} /> {warningCount}
          </span>
        </div>

        {/* Quick Launch Interpreter in Separate Window */}
        <button
          onClick={onOpenInterpreter}
          className="flex items-center gap-1 bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded font-mono font-bold text-white transition-colors"
          title="Abrir el intérprete en ventana independiente"
        >
          <Play size={10} fill="currentColor" />
          <span>Intérprete ({executionState.status})</span>
          <ExternalLink size={10} />
        </button>

        {/* Active Workspace Mode */}
        <span className="text-white/80 hidden sm:inline">
          Modo:{' '}
          <strong className="text-white">
            {currentMode === 'editor'
              ? 'Mesa de Taller'
              : currentMode === 'visual'
              ? 'Caja de Montaje'
              : 'Escáner de Despiece'}
          </strong>
        </span>
      </div>

      {/* Right Status Items */}
      <div className="flex items-center gap-3 font-mono">
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          Ln {cursorLine}, Col {cursorCol}
        </span>
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer hidden md:inline">
          Espacios: 4
        </span>
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer hidden md:inline">
          UTF-8
        </span>
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-bold text-[#ffdb00]">
          IkeaLang v1.1
        </span>
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <Bell size={12} />
        </span>
      </div>
    </footer>
  );
};
