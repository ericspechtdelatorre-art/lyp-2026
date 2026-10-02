// ============================================================================
// IKEALang v1.1 - Custom Visual Hardware & Tool Block Renderers
// ============================================================================

import React from 'react';
import {
  VariableDeclarationNode,
  PasoNode,
  StatementNode,
  IkeaType,
} from '../core/types.ts';
import { CONNECTOR_SPECS } from './hardwareBlocks.ts';
import {
  Wrench,
  Users,
  Repeat,
  Split,
  Box,
  Trash2,
  Plus,
  Play,
} from 'lucide-react';

interface HardwareCardProps {
  variable: VariableDeclarationNode;
  onUpdate: (updated: VariableDeclarationNode) => void;
  onDelete: () => void;
}

export const HardwareCard: React.FC<HardwareCardProps> = ({ variable, onUpdate, onDelete }) => {
  const spec = CONNECTOR_SPECS[variable.varType] || CONNECTOR_SPECS.TORNILLO;

  return (
    <div className="relative group bg-[#faf7f0] dark:bg-[#1a2c1f] border-2 border-[#c2b297] dark:border-[#2e4d36] rounded-xl p-3 shadow-md hover:shadow-lg transition-all flex flex-col gap-2 min-w-[200px]">
      {/* Physical Joint Header */}
      <div className="flex items-center justify-between border-b border-[#e2d8c3] dark:border-[#263e2c] pb-2">
        <div className="flex items-center gap-2">
          {/* Hardware shape peg */}
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm shadow-inner font-bold border border-black/20"
            style={{ backgroundColor: spec.color, color: '#fff' }}
            title={spec.label}
          >
            {spec.icon}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#7a6b58] dark:text-[#8ba793]">
              {variable.varType}
            </div>
            <input
              type="text"
              value={variable.name}
              onChange={(e) => onUpdate({ ...variable, name: e.target.value })}
              className="text-xs font-bold font-mono bg-transparent border-b border-transparent hover:border-[#0058a3] focus:border-[#0058a3] outline-none text-[#2d2822] dark:text-[#e4eee6]"
            />
          </div>
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-opacity"
          title="Retirar pieza de la caja"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Physical Value Slot */}
      <div className="flex items-center justify-between text-xs bg-white dark:bg-[#122016] p-2 rounded-lg border border-[#e5dccb] dark:border-[#28422f]">
        <span className="text-[#8c7a65] dark:text-[#7f9986] text-[11px]">Valor inicial:</span>
        <input
          type="text"
          value={
            variable.initialValue.type === 'Literal'
              ? String(variable.initialValue.value ?? '')
              : variable.initialValue.type === 'ArrayLiteral'
              ? '[]'
              : '0'
          }
          onChange={(e) => {
            const raw = e.target.value;
            const parsedVal =
              variable.varType === 'TORNILLO'
                ? parseFloat(raw) || 0
                : variable.varType === 'ENCAJE'
                ? raw === 'AJUSTA' || raw === 'true'
                : raw;

            onUpdate({
              ...variable,
              initialValue: {
                type: 'Literal',
                valueType: variable.varType,
                value: parsedVal,
                loc: variable.loc,
              },
            });
          }}
          className="font-mono text-xs font-semibold text-right bg-transparent outline-none w-24 text-[#0058a3] dark:text-[#ffdb00]"
        />
      </div>

      {/* Socket Teeth visualization */}
      <div className="flex items-center justify-end gap-1 pt-1">
        <span className="text-[10px] text-[#8c7a65] dark:text-[#7f9986] mr-auto">Conector:</span>
        <div
          className="w-3 h-3 rounded-full border border-black/30 shadow-sm"
          style={{ backgroundColor: spec.color }}
          title={`Enchufe geométrico: ${spec.label}`}
        />
      </div>
    </div>
  );
};

interface StepBlockProps {
  paso: PasoNode;
  isActive: boolean;
  onUpdate: (updated: PasoNode) => void;
  onDelete: () => void;
  onAddSubStatement: (type: 'repetir' | 'si' | 'entre_dos' | 'unir') => void;
  onExecutePaso?: () => void;
}

export const StepBlockCard: React.FC<StepBlockProps> = ({
  paso,
  isActive,
  onUpdate,
  onDelete,
  onAddSubStatement,
  onExecutePaso,
}) => {
  return (
    <div
      className={`relative bg-[#fcfaf5] dark:bg-[#16251b] border-2 rounded-2xl p-4 shadow-md transition-all ${
        isActive
          ? 'border-[#0058a3] dark:border-[#ffdb00] ring-4 ring-[#0058a3]/20 dark:ring-[#ffdb00]/20 scale-[1.01]'
          : 'border-[#d4c8b2] dark:border-[#263e2c] hover:border-[#b8a78c]'
      }`}
    >
      {/* Header: Manual step badge */}
      <div className="flex items-center justify-between border-b border-[#e5dcce] dark:border-[#263e2c] pb-3 mb-3">
        <div className="flex items-center gap-3">
          {/* IKEA Step Number Circle */}
          <div className="w-10 h-10 rounded-full bg-[#0058a3] dark:bg-[#ffdb00] text-white dark:text-[#0f1b13] flex items-center justify-center font-extrabold text-lg shadow-sm font-sans">
            {paso.stepNumber}
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest text-[#0058a3] dark:text-[#ffdb00] uppercase">
              Paso del Manual
            </div>
            <input
              type="text"
              value={paso.description}
              onChange={(e) => onUpdate({ ...paso, description: e.target.value })}
              className="text-sm font-bold text-[#2d2822] dark:text-[#e4eee6] bg-transparent outline-none border-b border-transparent hover:border-[#0058a3] focus:border-[#0058a3] w-72"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onExecutePaso && (
            <button
              onClick={onExecutePaso}
              className="p-1.5 bg-[#0058a3] hover:bg-[#004785] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
              title="Ejecutar solo este paso"
            >
              <Play size={13} /> Probar
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
            title="Eliminar paso del montaje"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Statements Container */}
      <div className="space-y-2.5 min-h-[50px] bg-[#f5f1e6] dark:bg-[#111e15] p-3 rounded-xl border border-dashed border-[#cfc3ad] dark:border-[#27402d]">
        {paso.body.length === 0 ? (
          <div className="text-center text-xs text-[#8c7d6b] dark:text-[#6e8a76] py-3 italic">
            Arrastra herramientas o añade una acción de montaje debajo
          </div>
        ) : (
          paso.body.map((stmt, idx) => (
            <StatementRenderer
              key={idx}
              stmt={stmt}
              onRemove={() => {
                const nextBody = [...paso.body];
                nextBody.splice(idx, 1);
                onUpdate({ ...paso, body: nextBody });
              }}
            />
          ))
        )}
      </div>

      {/* Quick Add Tool Blocks Bar */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#e8dfcf] dark:border-[#223927] text-xs">
        <span className="text-[11px] font-semibold text-[#877864] dark:text-[#7f9986]">
          Añadir Bloque de Herramienta:
        </span>
        <button
          onClick={() => onAddSubStatement('repetir')}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#ffdb00]/25 hover:bg-[#ffdb00]/40 text-[#855e00] dark:text-[#ffdb00] rounded-md font-medium transition-colors"
        >
          <Repeat size={12} /> REPETIR (Trinquete)
        </button>
        <button
          onClick={() => onAddSubStatement('si')}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 text-blue-700 rounded-md font-medium transition-colors"
        >
          <Split size={12} /> SI/SINO (Escuadra 90°)
        </button>
        <button
          onClick={() => onAddSubStatement('entre_dos')}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 text-amber-700 rounded-md font-medium transition-colors"
        >
          <Users size={12} /> ENTRE_DOS (Sargento Doble)
        </button>
        <button
          onClick={() => onAddSubStatement('unir')}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 text-emerald-700 rounded-md font-medium transition-colors"
        >
          <Wrench size={12} /> UNIR (Llave Allen)
        </button>
      </div>
    </div>
  );
};

// Render specialized Tool Blocks
const StatementRenderer: React.FC<{ stmt: StatementNode; onRemove: () => void }> = ({ stmt, onRemove }) => {
  if (stmt.type === 'Repetir') {
    return (
      <div className="bg-[#fff9db] dark:bg-[#282713] border-2 border-[#e6be22] dark:border-[#a88a10] rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-[#8a6a00] dark:text-[#ffd633] mb-1.5">
          <div className="flex items-center gap-1.5">
            <Repeat size={15} />
            <span>HERRAMIENTA: Trinquete Eléctrico (REPETIR)</span>
          </div>
          <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
        <div className="text-xs bg-white/70 dark:bg-black/30 p-2 rounded border border-[#e6be22]/40 font-mono">
          Rotaciones del mandril: {stmt.count.type === 'Literal' ? String(stmt.count.value) : '4'} veces
        </div>
      </div>
    );
  }

  if (stmt.type === 'Si') {
    return (
      <div className="bg-[#eff6ff] dark:bg-[#122338] border-2 border-[#60a5fa] dark:border-[#2563eb] rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-[#1d4ed8] dark:text-[#93c5fd] mb-1.5">
          <div className="flex items-center gap-1.5">
            <Split size={15} />
            <span>HERRAMIENTA: Escuadra de 90° (SI / SINO)</span>
          </div>
          <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
        <div className="text-xs bg-white/70 dark:bg-black/30 p-2 rounded border border-[#60a5fa]/40 font-mono">
          Condición de encaje evaluada con precisión milimétrica
        </div>
      </div>
    );
  }

  if (stmt.type === 'EntreDos') {
    return (
      <div className="bg-[#fffbeb] dark:bg-[#322411] border-2 border-[#f59e0b] dark:border-[#b45309] rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-[#b45309] dark:text-[#fcd34d] mb-1.5">
          <div className="flex items-center gap-1.5">
            <Users size={15} />
            <span>HERRAMIENTA: Sargento Paralelo Doble (ENTRE_DOS)</span>
          </div>
          <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
        <div className="text-xs bg-white/70 dark:bg-black/30 p-2 rounded border border-[#f59e0b]/40 font-mono">
          Protección antivuelco: 2 montadores operando en paralelo
        </div>
      </div>
    );
  }

  // Default expression or assignment
  return (
    <div className="bg-white dark:bg-[#17271c] border border-[#d6cbba] dark:border-[#2c4733] rounded-lg p-2 flex items-center justify-between text-xs font-mono shadow-sm">
      <span className="text-[#3a352c] dark:text-[#dbe6de]">
        {stmt.type === 'Assignment' ? `${stmt.target} = ...` : 'Acción de ensamble'}
      </span>
      <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-0.5">
        <Trash2 size={13} />
      </button>
    </div>
  );
};
