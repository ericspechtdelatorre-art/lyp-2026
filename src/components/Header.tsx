// ============================================================================
// IKEALang v1.1 - IDE Header, Navigation & Project Catalog Selector
// ============================================================================

import React from 'react';
import { SAMPLE_PROGRAMS, SampleProject } from '../core/samplePrograms.ts';
import {
  Code,
  LayoutGrid,
  Camera,
  Columns,
  Sun,
  Moon,
  BookOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEffects } from './AudioEffects.ts';

export type WorkspaceMode = 'editor' | 'visual' | 'scanner';

interface HeaderProps {
  currentMode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  splitView: boolean;
  onToggleSplitView: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedSampleId: string;
  onSelectSample: (sample: SampleProject) => void;
  onOpenDocs: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  splitView,
  onToggleSplitView,
  theme,
  onToggleTheme,
  selectedSampleId,
  onSelectSample,
  onOpenDocs,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="h-14 bg-[#0058a3] text-white flex items-center justify-between px-4 shadow-md border-b-2 border-[#00427a] select-none z-30">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#ffdb00] text-[#0058a3] px-2.5 py-1 rounded-lg font-black text-sm tracking-tighter shadow-inner">
          <span className="text-base leading-none">IKEA</span>
          <span className="text-[10px] bg-[#0058a3] text-white px-1.5 py-0.5 rounded font-bold font-mono">
            LANG 1.1
          </span>
        </div>
        <div className="hidden sm:block">
          <h1 className="font-extrabold text-sm tracking-tight leading-none">
            KALLAX Studio
          </h1>
          <span className="text-[10px] text-white/70 font-mono">
            Flat-Pack Assembly IDE
          </span>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center bg-[#00427a] p-1 rounded-xl gap-1">
        <button
          onClick={() => {
            onModeChange('editor');
            soundEffects.playWoodenSnap();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'editor'
              ? 'bg-[#ffdb00] text-[#00427a] shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          title="Modo 1: Editor de código con regla milimétrica y linter"
        >
          <Code size={14} />
          <span className="hidden md:inline">1. Mesa de Taller</span>
        </button>

        <button
          onClick={() => {
            onModeChange('visual');
            soundEffects.playWoodenSnap();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'visual'
              ? 'bg-[#ffdb00] text-[#00427a] shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          title="Modo 2: Editor visual de bloques físicos sincronizado"
        >
          <LayoutGrid size={14} />
          <span className="hidden md:inline">2. Caja de Montaje</span>
        </button>

        <button
          onClick={() => {
            onModeChange('scanner');
            soundEffects.playWoodenSnap();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentMode === 'scanner'
              ? 'bg-[#ffdb00] text-[#00427a] shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          title="Modo 3: Visión por computador y despiece inverso AR"
        >
          <Camera size={14} />
          <span className="hidden md:inline">3. Escáner de Despiece</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Sample Projects Selector */}
        <select
          value={selectedSampleId}
          onChange={(e) => {
            const found = SAMPLE_PROGRAMS.find(s => s.id === e.target.value);
            if (found) {
              onSelectSample(found);
              soundEffects.playRatchet();
            }
          }}
          className="bg-[#00427a] hover:bg-[#003766] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20 outline-none cursor-pointer max-w-[150px] truncate"
        >
          {SAMPLE_PROGRAMS.map(p => (
            <option key={p.id} value={p.id} className="bg-[#00427a] text-white">
              {p.name}
            </option>
          ))}
        </select>

        {/* Split View Toggle */}
        <button
          onClick={onToggleSplitView}
          className={`p-1.5 rounded-lg border border-white/20 text-xs font-bold transition-colors ${
            splitView ? 'bg-[#ffdb00] text-[#0058a3]' : 'bg-[#00427a] text-white hover:bg-[#003766]'
          }`}
          title="Alternar vista dividida: Código + Bloques en paralelo"
        >
          <Columns size={16} />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-lg bg-[#00427a] hover:bg-[#003766] border border-white/20 text-white transition-colors"
          title={soundEnabled ? 'Silenciar efectos sonoros' : 'Activar efectos de montaje'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Documentation Reference Button */}
        <button
          onClick={onOpenDocs}
          className="p-1.5 rounded-lg bg-[#00427a] hover:bg-[#003766] border border-white/20 text-white transition-colors"
          title="Manual Oficial de Especificación IkeaLang"
        >
          <BookOpen size={16} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-[#00427a] hover:bg-[#003766] border border-white/20 text-white transition-colors"
          title={theme === 'light' ? 'Tema Mesa de Corte Verde (Oscuro)' : 'Tema Papel Reciclado (Claro)'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-[#ffdb00]" />}
        </button>
      </div>
    </header>
  );
};
