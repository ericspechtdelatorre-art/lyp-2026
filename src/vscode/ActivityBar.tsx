// ============================================================================
// IKEALang v1.1 - VS Code Activity Bar (Leftmost Vertical Icon Strip)
// ============================================================================

import React from 'react';
import {
  Files,
  Code2,
  Boxes,
  Camera,
  PlaySquare,
  BookOpen,
  Volume2,
  VolumeX,
  Settings,
  Columns,
} from 'lucide-react';
import { WorkspaceMode } from '../components/Header.tsx';

interface ActivityBarProps {
  currentMode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenInterpreter: () => void;
  onOpenDocs: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  interpreterActive: boolean;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  currentMode,
  onModeChange,
  isSidebarOpen,
  onToggleSidebar,
  onOpenInterpreter,
  onOpenDocs,
  soundEnabled,
  onToggleSound,
  splitView,
  onToggleSplitView,
  interpreterActive,
}) => {
  return (
    <aside className="w-12 h-full bg-[#333333] border-r border-[#252526] flex flex-col items-center justify-between py-2 select-none z-30 shrink-0">
      {/* Top Main Navigation Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* 1. File Explorer */}
        <button
          onClick={onToggleSidebar}
          className={`w-full h-10 flex items-center justify-center relative transition-colors ${
            isSidebarOpen
              ? 'text-white border-l-2 border-white bg-[#252526]/50'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title="Explorador de Archivos (Ctrl+Shift+E)"
        >
          <Files size={20} />
        </button>

        {/* 2. Mode 1: Mesa de Taller (Code) */}
        <button
          onClick={() => onModeChange('editor')}
          className={`w-full h-10 flex items-center justify-center relative transition-colors ${
            currentMode === 'editor'
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/50'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title="Modo 1: Mesa de Taller (Editor de Código IkeaLang)"
        >
          <Code2 size={20} />
        </button>

        {/* 3. Mode 2: Caja de Montaje (Visual Blocks) */}
        <button
          onClick={() => onModeChange('visual')}
          className={`w-full h-10 flex items-center justify-center relative transition-colors ${
            currentMode === 'visual'
              ? 'text-white border-l-2 border-[#ffdb00] bg-[#252526]/50'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title="Modo 2: Caja de Montaje (Lienzo Visual de Bloques)"
        >
          <Boxes size={20} />
        </button>

        {/* 4. Mode 3: Escáner de Despiece (CV & AR) */}
        <button
          onClick={() => onModeChange('scanner')}
          className={`w-full h-10 flex items-center justify-center relative transition-colors ${
            currentMode === 'scanner'
              ? 'text-white border-l-2 border-[#10b981] bg-[#252526]/50'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title="Modo 3: Escáner de Despiece (Visión Espacial y AR)"
        >
          <Camera size={20} />
        </button>

        {/* 5. Intérprete en Ventana Aparte (Run and Debug) */}
        <button
          onClick={onOpenInterpreter}
          className="w-full h-10 flex items-center justify-center relative text-[#ffdb00] hover:text-white transition-colors group"
          title="Abrir Intérprete y Montaje 3D en Ventana Aparte"
        >
          <PlaySquare size={20} className="group-hover:scale-110 transition-transform" />
          {interpreterActive && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        {/* Split View Toggle */}
        <button
          onClick={onToggleSplitView}
          className={`w-full h-10 flex items-center justify-center relative transition-colors ${
            splitView
              ? 'text-[#007acc] border-l-2 border-[#007acc]'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title="Dividir Editor: Código + Bloques en paralelo"
        >
          <Columns size={19} />
        </button>
      </div>

      {/* Bottom Utility Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
          title={soundEnabled ? 'Silenciar audio de montaje' : 'Activar audio de montaje'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Documentation Reference */}
        <button
          onClick={onOpenDocs}
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
          title="Manual de Especificación Oficial IkeaLang"
        >
          <BookOpen size={18} />
        </button>

        {/* Settings / Gear */}
        <button
          onClick={onOpenDocs}
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
          title="Configuración de KALLAX Studio"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};
