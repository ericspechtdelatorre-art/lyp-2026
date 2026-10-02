// ============================================================================
// IKEALang v1.1 - Documentation Reference Modal
// ============================================================================

import React from 'react';
import { X, BookOpen, Wrench, ShieldAlert, Cpu } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#f8f5ee] dark:bg-[#121f15] border-2 border-[#0058a3] dark:border-[#ffdb00] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0058a3] text-white">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[#ffdb00]" />
            <h2 className="font-extrabold text-base tracking-tight">
              Manual Oficial de IkeaLang v1.1.0
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#2b2721] dark:text-[#dce7df] select-text">
          {/* Section 1 */}
          <div>
            <h3 className="font-extrabold text-sm text-[#0058a3] dark:text-[#ffdb00] uppercase mb-2 flex items-center gap-1.5">
              <Cpu size={15} /> 1. Anatomía Estructural del Fichero (.ikea)
            </h3>
            <p className="mb-2 leading-relaxed">
              Todo programa en IkeaLang sigue estrictamente las etapas físicas del desembalaje y montaje:
            </p>
            <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px]">
              <li><strong className="text-[#0058a3] dark:text-[#ffdb00]">MUEBLE &lt;Nombre&gt;</strong>: Define el artefacto exportable.</li>
              <li><strong className="text-[#0058a3] dark:text-[#ffdb00]">HERRAMIENTAS &#123; ... &#125;</strong>: Importa librerías nativas (<code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">TRAER IMPRESORA</code>, <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">LLAVE_ALLEN</code>), catálogo o módulos locales.</li>
              <li><strong className="text-[#0058a3] dark:text-[#ffdb00]">CAJA &#123; ... &#125;</strong>: Desembalaje de hardware. Solo declaraciones de variables con tipo explícito.</li>
              <li><strong className="text-[#0058a3] dark:text-[#ffdb00]">MONTAJE &#123; ... &#125;</strong>: Bloques secuenciales numerados: <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">PASO 1: "Desc" &#123; ... &#125;</code>.</li>
              <li><strong className="text-[#0058a3] dark:text-[#ffdb00]">TERMINADO &lt;retorno&gt;;</strong>: Salida final del mueble listo para su uso.</li>
            </ol>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="font-extrabold text-sm text-[#0058a3] dark:text-[#ffdb00] uppercase mb-2 flex items-center gap-1.5">
              <Wrench size={15} /> 2. Tipos de Datos y Operadores
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-white dark:bg-[#18291c] border border-neutral-300 dark:border-neutral-800">
                <span className="font-bold text-amber-600 dark:text-amber-400">TORNILLO</span>: Numérico (medidas en mm, cuentas).
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#18291c] border border-neutral-300 dark:border-neutral-800">
                <span className="font-bold text-amber-800 dark:text-amber-300">TABLERO</span>: Texto/cadenas UTF-8 inmutables.
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#18291c] border border-neutral-300 dark:border-neutral-800">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">ENCAJE</span>: Booleano (<code className="font-bold">AJUSTA</code> / <code className="font-bold">SUELTO</code>).
              </div>
              <div className="p-2 rounded bg-white dark:bg-[#18291c] border border-neutral-300 dark:border-neutral-800">
                <span className="font-bold text-sky-600 dark:text-sky-400">CAJON[T]</span>: Colección indexada homogénea.
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed">
              <strong>Operadores:</strong> <code className="font-bold">UNIR</code> (+ suma/concat/push), <code className="font-bold">RETIRAR</code> (- resta/pop), <code className="font-bold">DUPLICAR</code> (* multiplicación), <code className="font-bold">SECCIONAR</code> (/ división), <code className="font-bold">ENCAJA</code> (==), <code className="font-bold">NO_ENCAJA</code> (!=).
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-extrabold text-sm text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1.5">
              <ShieldAlert size={15} /> 3. Principio Zero-Leftovers & Reglas del Linter
            </h3>
            <ul className="space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-red-700 dark:text-red-400">ERROR 101: PIEZAS_SOBRANTES:</strong> Si declaras una pieza en la <code className="font-mono">CAJA</code> o importas una herramienta y nunca la usas en ningún <code className="font-mono">PASO</code>, la compilación fallará. ¡En IKEA no se dejan tornillos olvidados en el suelo!
              </li>
              <li>
                <strong className="text-red-700 dark:text-red-400">ERROR 102: TORNILLO_PASADO:</strong> Conflicto de tipos o sobrepaso de rosca.
              </li>
              <li>
                <strong className="text-red-700 dark:text-red-400">PANICO: VUELCO:</strong> Llamar a funciones de red, disco o tareas pesadas sin envolverlas en un bloque <code className="font-mono font-bold">ENTRE_DOS &#123; ... &#125;</code> (trabajo en equipo para evitar que el mueble caiga).
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#eae2d0] dark:bg-[#17271c] border-t border-[#d8cca8] dark:border-[#213825] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0058a3] hover:bg-[#004785] text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            Entendido, cerrar manual
          </button>
        </div>
      </div>
    </div>
  );
};
