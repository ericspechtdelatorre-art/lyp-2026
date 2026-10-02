// ============================================================================
// IKEALang v1.1 - Execution Toolbar (Assembly Debugger & Step Stepper)
// ============================================================================

import React from 'react';
import { ExecutionState } from '../core/types.ts';
import { soundEffects } from './AudioEffects.ts';
import {
  Play,
  SkipForward,
  Pause,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface ExecutionToolbarProps {
  executionState: ExecutionState;
  onRunAll: () => void;
  onStep: () => void;
  onPause?: () => void;
  onReset: () => void;
  onFormat: () => void;
  hasErrors: boolean;
}

export const ExecutionToolbar: React.FC<ExecutionToolbarProps> = ({
  executionState,
  onRunAll,
  onStep,
  onReset,
  onFormat,
  hasErrors,
}) => {
  const isRunning = executionState.status === 'running';
  const isCompleted = executionState.status === 'completed';

  return (
    <div className="h-11 bg-[#ebe3d3] dark:bg-[#16271c] border-b border-[#d8cca8] dark:border-[#213825] flex items-center justify-between px-4 text-xs select-none">
      {/* Assembly Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Play / Run All */}
        <button
          onClick={() => {
            soundEffects.playRatchet();
            onRunAll();
          }}
          disabled={hasErrors || isRunning || isCompleted}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0058a3] hover:bg-[#004785] disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95"
          title="Montar el mueble completo paso a paso"
        >
          <Play size={13} fill="currentColor" />
          <span>Montar Todo</span>
        </button>

        {/* Step Siguiente Paso */}
        <button
          onClick={() => {
            soundEffects.playWoodenSnap();
            onStep();
          }}
          disabled={hasErrors || isCompleted}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffdb00] hover:bg-[#e6c500] text-[#0f1b13] disabled:opacity-50 rounded-lg font-bold shadow-sm transition-all active:scale-95"
          title="Ejecutar el siguiente PASO del manual"
        >
          <SkipForward size={13} fill="currentColor" />
          <span>Siguiente Paso (PASO {executionState.currentStepIndex + 1})</span>
        </button>

        {/* Reset / Desarmar */}
        <button
          onClick={() => {
            soundEffects.playWoodenSnap();
            onReset();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-[#203626] hover:bg-neutral-100 text-[#4a3f31] dark:text-[#d7e6dc] border border-[#cfc1a5] dark:border-[#2b4832] rounded-lg font-semibold transition-all"
          title="Reiniciar y volver a desembalar la caja"
        >
          <RotateCcw size={13} />
          <span>Desarmar</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-[#d2c4aa] dark:bg-[#28422f] mx-1" />

        {/* Format Code */}
        <button
          onClick={() => {
            soundEffects.playRatchet();
            onFormat();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-[#203626] hover:bg-neutral-100 text-[#4a3f31] dark:text-[#d7e6dc] border border-[#cfc1a5] dark:border-[#2b4832] rounded-lg font-semibold transition-all"
          title="Formatear código con espaciado milimétrico"
        >
          <AlignLeft size={13} />
          <span>Formatear</span>
        </button>
      </div>

      {/* Assembly Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Step Counter */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#6b5b47] dark:text-[#8aa591]">
          <span className="font-bold">PASO:</span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1a2e20] border border-[#d2c4aa] dark:border-[#28422f] font-bold text-[#0058a3] dark:text-[#ffdb00]">
            {executionState.currentStepIndex} / {executionState.totalSteps}
          </span>
        </div>

        {/* Status Badge */}
        {executionState.status === 'completed' && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full font-bold text-[11px]">
            <CheckCircle size={12} />
            <span>MUEBLE TERMINADO</span>
          </div>
        )}

        {executionState.status === 'error' && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-full font-bold text-[11px]">
            <AlertCircle size={12} />
            <span>ERROR DE MONTAJE</span>
          </div>
        )}

        {executionState.status === 'running' && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-full font-bold text-[11px] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>Ensamblando...</span>
          </div>
        )}
      </div>
    </div>
  );
};
