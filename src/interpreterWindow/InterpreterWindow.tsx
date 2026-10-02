// ============================================================================
// IKEALang v1.1 - Standalone / Pop-out Interpreter Window Component
// ============================================================================

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ExecutionState, ProgramNode, FurnitureModelId, detectFurnitureModel } from '../core/types.ts';
import { AssemblyViewport3d } from '../inspector3d/AssemblyViewport3d.tsx';
import { MemoryInspector } from '../components/MemoryInspector.tsx';
import { DiagnosticsConsole } from '../components/DiagnosticsConsole.tsx';
import { ExecutionToolbar } from '../components/ExecutionToolbar.tsx';
import {
  ExternalLink,
  Minimize2,
  Maximize2,
  X,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface InterpreterWindowProps {
  isOpen: boolean;
  onClose: () => void;
  executionState: ExecutionState;
  onRunAll: () => void;
  onStep: () => void;
  onReset: () => void;
  onFormat: () => void;
  hasErrors: boolean;
  modelId?: FurnitureModelId;
  ast: ProgramNode | null;
  onClearLogs: () => void;
}

export const InterpreterWindow: React.FC<InterpreterWindowProps> = ({
  isOpen,
  onClose,
  executionState,
  onRunAll,
  onStep,
  onReset,
  onFormat,
  hasErrors,
  modelId,
  ast,
  onClearLogs,
}) => {
  const [isPopout, setIsPopout] = useState(false);
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);

  const effectiveModelId = detectFurnitureModel(ast?.mueble) || modelId || 'generic';

  // Open separate browser window
  const handleOpenBrowserWindow = () => {
    const width = 1000;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const newWindow = window.open(
      '',
      'IkeaLangInterpreterPopup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (newWindow) {
      newWindow.document.title = 'IKEALang v1.1 - Intérprete y Montaje 3D (Ventana Independiente)';
      // Copy styles
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleTag) => {
        newWindow.document.head.appendChild(styleTag.cloneNode(true));
      });

      // Tailored body background
      newWindow.document.body.className = 'bg-[#181818] text-[#cccccc] m-0 p-0 overflow-hidden font-sans';

      setPopoutWindow(newWindow);
      setIsPopout(true);

      newWindow.onbeforeunload = () => {
        setIsPopout(false);
        setPopoutWindow(null);
      };
    } else {
      alert('La ventana emergente fue bloqueada por el navegador. Mostrando ventana flotante.');
    }
  };

  const handleClosePopout = () => {
    if (popoutWindow) {
      popoutWindow.close();
    }
    setIsPopout(false);
    setPopoutWindow(null);
  };

  useEffect(() => {
    return () => {
      if (popoutWindow) {
        popoutWindow.close();
      }
    };
  }, [popoutWindow]);

  if (!isOpen) return null;

  const content = (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] select-none overflow-hidden font-sans border border-[#3c3c3c] shadow-2xl">
      {/* 1. Window Title Bar (VS Code Style) */}
      <div className="h-9 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-3 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#007acc] flex items-center justify-center text-[8px] font-bold text-white">
            ▶
          </div>
          <span className="font-bold text-[#e1e1e1] font-mono">
            INTÉRPRETE Y DEPURADOR VIRTUAL IKEALANG v1.1
          </span>
          <span className="text-[10px] text-[#858585] ml-2">
            [{ast?.mueble || 'Mueble'}]
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isPopout ? (
            <button
              onClick={handleOpenBrowserWindow}
              className="px-2 py-0.5 bg-[#333333] hover:bg-[#444444] text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Abrir en ventana independiente del navegador (Segunda Pantalla)"
            >
              <ExternalLink size={12} />
              <span>Desacoplar a Ventana Externa</span>
            </button>
          ) : (
            <button
              onClick={handleClosePopout}
              className="px-2 py-0.5 bg-[#333333] hover:bg-[#444444] text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Volver a acoplar al IDE"
            >
              <Minimize2 size={12} />
              <span>Re-acoplar al IDE</span>
            </button>
          )}

          <button
            onClick={() => {
              if (isPopout) handleClosePopout();
              onClose();
            }}
            className="p-1 hover:bg-red-600 text-white rounded transition-colors"
            title="Cerrar ventana"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Debugger Action Controls Bar */}
      <div className="bg-[#2d2d2d] border-b border-[#3c3c3c]">
        <ExecutionToolbar
          executionState={executionState}
          onRunAll={onRunAll}
          onStep={onStep}
          onReset={onReset}
          onFormat={onFormat}
          hasErrors={hasErrors}
        />
      </div>

      {/* 3. Main Split Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left 55%: 3D Blueprint Assembly Viewport */}
        <div className="flex-1 h-full p-2 bg-[#181818] border-r border-[#3c3c3c] flex flex-col">
          <div className="text-[11px] font-mono font-bold text-[#858585] mb-1 px-1 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>PLANO ISOMÉTRICO 3D</span>
              <span className="text-[#007acc] px-1.5 py-0.2 rounded bg-[#007acc]/10 border border-[#007acc]/30 uppercase text-[10px]">
                {effectiveModelId}
              </span>
            </span>
            <span className="text-[#007acc]">
              PASO {executionState.currentStepIndex}/{executionState.totalSteps || ast?.montaje.length || 3}
            </span>
          </div>
          <div className="flex-1 relative rounded-lg overflow-hidden border border-[#333333]">
            <AssemblyViewport3d
              currentStep={executionState.currentStepIndex}
              totalSteps={executionState.totalSteps || ast?.montaje.length || 3}
              modelId={effectiveModelId}
              stepDescription={ast?.montaje[executionState.currentStepIndex - 1]?.description}
            />
          </div>
        </div>

        {/* Right 45%: Memory Table & Console */}
        <div className="w-[420px] h-full flex flex-col bg-[#1e1e1e]">
          {/* Top Half: Memory Inspector */}
          <div className="h-1/2 border-b border-[#3c3c3c] overflow-hidden">
            <MemoryInspector variables={executionState.variables} />
          </div>

          {/* Bottom Half: Console Logs */}
          <div className="h-1/2 overflow-hidden">
            <DiagnosticsConsole
              logs={executionState.logs}
              diagnostics={[]}
              onClearLogs={onClearLogs}
            />
          </div>
        </div>
      </div>

      {/* 4. Bottom Window Status Bar */}
      <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-mono select-none">
        <div className="flex items-center gap-3">
          <span>✓ Hilos Concurrencia: {executionState.activeWorkerLanes}</span>
          <span>•</span>
          <span>
            Estado:{' '}
            <strong className="uppercase">{executionState.status}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Memoria CAJA: {Object.keys(executionState.variables).length} piezas</span>
        </div>
      </div>
    </div>
  );

  // If popped out to separate browser window, render via React Portal!
  if (isPopout && popoutWindow) {
    return ReactDOM.createPortal(content, popoutWindow.document.body);
  }

  // Otherwise, render as a floating overlay window inside the main app
  return (
    <div className="fixed inset-4 md:inset-10 z-50 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-[#444444] animate-in fade-in zoom-in-95 duration-150">
      {content}
    </div>
  );
};
