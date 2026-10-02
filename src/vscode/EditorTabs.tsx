// ============================================================================
// IKEALang v1.1 - VS Code Editor Tabs & Breadcrumbs
// ============================================================================

import React from 'react';
import {
  X,
  Play,
  ExternalLink,
  AlignLeft,
  Columns,
  ChevronRight,
} from 'lucide-react';

interface EditorTabsProps {
  activeFileName: string;
  onOpenInterpreter: () => void;
  onFormat: () => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  muebleName?: string;
  filePath?: string;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  activeFileName,
  onOpenInterpreter,
  onFormat,
  splitView,
  onToggleSplitView,
  muebleName,
  filePath = 'workspace',
}) => {
  return (
    <div className="w-full bg-[#181818] select-none shrink-0 font-sans border-b border-[#2d2d2d]">
      {/* 1. Tabs Row */}
      <div className="h-9 flex items-center justify-between px-2 bg-[#252526] border-b border-[#1f1f1f]">
        {/* Active Tab */}
        <div className="flex items-center">
          <div className="h-9 px-3.5 flex items-center gap-2 bg-[#1e1e1e] border-t-2 border-[#007acc] text-[#ffffff] font-mono text-xs shadow-sm">
            <span className="text-[#ffdb00]">🪑</span>
            <span>{activeFileName}</span>
            <span className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer ml-1">
              <X size={12} />
            </span>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Prominent Button: Abrir Intérprete en Ventana Aparte */}
          <button
            onClick={onOpenInterpreter}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-bold shadow-sm transition-all"
            title="Abrir el intérprete, depurador y plano 3D en ventana aparte"
          >
            <Play size={12} fill="currentColor" />
            <ExternalLink size={12} />
            <span>Abrir Intérprete en Ventana Aparte</span>
          </button>

          {/* Format */}
          <button
            onClick={onFormat}
            className="p-1.5 hover:bg-[#333333] text-[#cccccc] hover:text-white rounded transition-colors"
            title="Dar formato al documento (Formatear)"
          >
            <AlignLeft size={14} />
          </button>

          {/* Split view */}
          <button
            onClick={onToggleSplitView}
            className={`p-1.5 rounded transition-colors ${
              splitView ? 'bg-[#37373d] text-white' : 'hover:bg-[#333333] text-[#cccccc]'
            }`}
            title="Dividir editor a la derecha"
          >
            <Columns size={14} />
          </button>
        </div>
      </div>

      {/* 2. Breadcrumbs Bar */}
      <div className="h-6 px-3 flex items-center gap-1 text-[11px] font-mono text-[#858585] bg-[#1e1e1e] border-b border-[#282828]">
        <span>workspace</span>
        <ChevronRight size={12} />
        <span>{filePath}</span>
        <ChevronRight size={12} />
        <span className="text-[#cccccc]">{activeFileName}</span>
        {muebleName && (
          <>
            <ChevronRight size={12} />
            <span className="text-[#ffdb00] font-bold">{muebleName}</span>
          </>
        )}
      </div>
    </div>
  );
};
