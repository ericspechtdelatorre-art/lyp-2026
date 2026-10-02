// ============================================================================
// IKEALang v1.1 - Memory Inspector (La Caja & Variable Inspection Table)
// ============================================================================

import React from 'react';
import { MemoryVariable } from '../core/types.ts';
import { CONNECTOR_SPECS } from '../visual/hardwareBlocks.ts';
import { Box, Check, AlertCircle } from 'lucide-react';

interface MemoryInspectorProps {
  variables: Record<string, MemoryVariable>;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({ variables }) => {
  const varList = Object.values(variables);

  return (
    <div className="w-full h-full flex flex-col bg-[#faf7f0] dark:bg-[#121f15] overflow-hidden select-none">
      <div className="px-3 py-2 bg-[#eae2d0] dark:bg-[#17291c] border-b border-[#d8cca8] dark:border-[#213825] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-[#483d30] dark:text-[#dbe8dd]">
          <Box size={14} className="text-[#0058a3] dark:text-[#ffdb00]" />
          <span>ESTADO DE PIEZAS EN MEMORIA (CAJA)</span>
        </div>
        <span className="text-[11px] font-mono text-[#7a6b57] dark:text-[#839e8b]">
          {varList.length} variables activas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {varList.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8c7b66] dark:text-[#6a8571] italic">
            No hay piezas desempaquetadas en la CAJA.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#e2d8c3] dark:border-[#253e2b] text-[#7a6b57] dark:text-[#839e8b] text-[10px] uppercase">
                <th className="py-1 px-2">Tipo</th>
                <th className="py-1 px-2">Nombre</th>
                <th className="py-1 px-2">Valor Actual</th>
                <th className="py-1 px-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {varList.map((v) => {
                const spec = CONNECTOR_SPECS[v.type] || CONNECTOR_SPECS.TORNILLO;
                return (
                  <tr
                    key={v.name}
                    className="border-b border-[#f0e8d8] dark:border-[#1a2d1f] hover:bg-[#ede5d3] dark:hover:bg-[#192b1d] transition-colors"
                  >
                    <td className="py-1.5 px-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: spec.color }}
                      >
                        {v.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-bold text-[#2d2822] dark:text-[#dce7df]">
                      {v.name}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[#0058a3] dark:text-[#ffdb00] max-w-[150px] truncate">
                      {typeof v.value === 'string'
                        ? `"${v.value}"`
                        : typeof v.value === 'boolean'
                        ? v.value
                          ? 'AJUSTA'
                          : 'SUELTO'
                        : JSON.stringify(v.value)}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {v.usedInMontaje ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-sans font-semibold">
                          <Check size={11} /> Usada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-sans font-semibold">
                          <AlertCircle size={11} /> Suelta
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
