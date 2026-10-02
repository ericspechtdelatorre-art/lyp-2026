// ============================================================================
// IKEALang v1.1 - Mascot Advisor (Gubbe - The Flat-Pack Manual Mascot)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Diagnostic, ExecutionState } from '../core/types.ts';
import confetti from 'canvas-confetti';
import { soundEffects } from './AudioEffects.ts';
import { X, MessageSquare, Sparkles } from 'lucide-react';

interface MascotAdvisorProps {
  diagnostics: Diagnostic[];
  executionState: ExecutionState;
}

export const MascotAdvisor: React.FC<MascotAdvisorProps> = ({
  diagnostics,
  executionState,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Trigger celebration confetti when completed!
  useEffect(() => {
    if (executionState.status === 'completed') {
      soundEffects.playCelebration();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0058a3', '#ffdb00', '#ffffff'],
        });
      } catch (e) {
        // Confetti optional
      }
    }
  }, [executionState.status]);

  // Determine current mascot state and hint
  let mascotMood: 'neutral' | 'confused' | 'panic' | 'celebrating' = 'neutral';
  let message = '¡Hej! Soy Gubbe, tu asistente de montaje. Revisa el manual antes de apretar.';

  const leftoverDiag = diagnostics.find(d => d.code === 'PIEZAS_SOBRANTES');
  const panicDiag = diagnostics.find(d => d.code === 'PANICO_VUELCO');
  const errorDiag = diagnostics.find(d => d.severity === 'error');

  if (executionState.status === 'completed') {
    mascotMood = 'celebrating';
    message = '¡Fantastisk! Mueble ensamblado al 100%. Sin piezas sobrantes en el suelo.';
  } else if (panicDiag) {
    mascotMood = 'panic';
    message = '¡Cuidado con el vuelco! Sujeta la estructura con dos personas (bloque ENTRE_DOS).';
  } else if (leftoverDiag) {
    mascotMood = 'confused';
    message = leftoverDiag.mascotHint || 'Me rasco la cabeza: te sobran piezas en la caja que nunca has ensamblado.';
  } else if (errorDiag) {
    mascotMood = 'confused';
    message = errorDiag.mascotHint || errorDiag.message;
  } else if (executionState.status === 'running') {
    message = `Siguiendo las instrucciones del PASO ${executionState.currentStepIndex + 1}...`;
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 p-2.5 bg-[#ffdb00] text-[#0058a3] rounded-full shadow-xl border-2 border-[#0058a3] hover:scale-105 transition-transform"
        title="Mostrar asistente Gubbe"
      >
        <span className="font-extrabold text-xs">Gubbe 💡</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs bg-white dark:bg-[#1a2d1f] border-2 border-[#0058a3] dark:border-[#ffdb00] rounded-2xl p-3 shadow-2xl flex items-start gap-3 select-none">
      {/* SVG Mascot Character Avatar */}
      <div className="shrink-0 relative">
        <svg
          viewBox="0 0 48 48"
          className={`w-12 h-12 ${mascotMood === 'confused' ? 'animate-bounce' : ''}`}
        >
          {/* Head */}
          <circle cx="24" cy="24" r="20" fill="#ffdb00" stroke="#0058a3" strokeWidth="3" />
          
          {/* Eyes */}
          {mascotMood === 'celebrating' ? (
            <>
              <path d="M16 22 Q18 18 20 22" fill="none" stroke="#0058a3" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M28 22 Q30 18 32 22" fill="none" stroke="#0058a3" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="18" cy="20" r="2.5" fill="#0058a3" />
              <circle cx="30" cy="20" r="2.5" fill="#0058a3" />
            </>
          )}

          {/* Mouth */}
          {mascotMood === 'celebrating' ? (
            <path d="M16 28 Q24 38 32 28" fill="none" stroke="#0058a3" strokeWidth="3" strokeLinecap="round" />
          ) : mascotMood === 'panic' ? (
            <ellipse cx="24" cy="30" rx="4" ry="6" fill="#0058a3" />
          ) : mascotMood === 'confused' ? (
            <path d="M18 32 Q24 26 30 30" fill="none" stroke="#0058a3" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M18 29 Q24 34 30 29" fill="none" stroke="#0058a3" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Hand scratching head if confused */}
          {mascotMood === 'confused' && (
            <>
              <path d="M34 14 Q38 10 36 20" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
              <text x="36" y="12" fontSize="12" fontWeight="bold" fill="#d97706">?</text>
            </>
          )}
        </svg>

        {mascotMood === 'celebrating' && (
          <span className="absolute -top-1 -right-1 text-sm animate-spin">
            ✨
          </span>
        )}
      </div>

      {/* Message Bubble */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0058a3] dark:text-[#ffdb00]">
            Gubbe • Manual IKEA
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-0.5"
            title="Minimizar"
          >
            <X size={12} />
          </button>
        </div>

        <p className="text-xs text-[#2b2721] dark:text-[#dce7df] leading-snug font-medium">
          {message}
        </p>
      </div>
    </div>
  );
};
