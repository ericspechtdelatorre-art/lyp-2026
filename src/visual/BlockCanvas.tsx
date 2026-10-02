// ============================================================================
// IKEALang v1.1 - MODE 2: "Caja de Montaje" (Visual Block Canvas)
// ============================================================================

import React, { useState } from 'react';
import {
  ProgramNode,
  VariableDeclarationNode,
  PasoNode,
  IkeaType,
} from '../core/types.ts';
import { HardwareCard, StepBlockCard } from './BlockNode.tsx';
import {
  Box,
  Layers,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface BlockCanvasProps {
  ast: ProgramNode | null;
  onProgramChange: (ast: ProgramNode) => void;
  activeStepIndex?: number;
  onExecutePaso?: (stepIndex: number) => void;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  ast,
  onProgramChange,
  activeStepIndex,
  onExecutePaso,
}) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'caja' | 'montaje'>('all');

  if (!ast) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe4] dark:bg-[#101b13] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0058a3]/10 dark:bg-[#ffdb00]/10 text-[#0058a3] dark:text-[#ffdb00] flex items-center justify-center mb-4">
          <Wrench size={32} />
        </div>
        <h3 className="text-lg font-bold text-[#2d2822] dark:text-[#e5ede7]">
          Esperando plano sintáctico válido...
        </h3>
        <p className="text-sm text-[#7f6f5d] dark:text-[#839e8a] max-w-md mt-1">
          Corrige los errores de sintaxis en la "Mesa de Taller" para reconstruir la visualización de bloques físicos.
        </p>
      </div>
    );
  }

  // Calculate used vs declared pieces (Zero-Leftovers principle visualizer)
  const totalCajaPieces = ast.caja.length;

  const handleAddVariable = (type: IkeaType) => {
    const count = ast.caja.length + 1;
    const newVar: VariableDeclarationNode = {
      type: 'VariableDeclaration',
      varType: type,
      name: `${type.toLowerCase()}_${count}`,
      initialValue: {
        type: 'Literal',
        valueType: type,
        value: type === 'TORNILLO' ? 4 : type === 'TABLERO' ? 'Pieza_Madera' : type === 'ENCAJE' ? true : ([] as any[]),
        loc: { line: 1, column: 1 },
      },
      loc: { line: 1, column: 1 },
    };

    const nextAst: ProgramNode = {
      ...ast,
      caja: [...ast.caja, newVar],
    };
    onProgramChange(nextAst);
  };

  const handleUpdateVariable = (idx: number, updated: VariableDeclarationNode) => {
    const nextCaja = [...ast.caja];
    nextCaja[idx] = updated;
    onProgramChange({ ...ast, caja: nextCaja });
  };

  const handleDeleteVariable = (idx: number) => {
    const nextCaja = [...ast.caja];
    nextCaja.splice(idx, 1);
    onProgramChange({ ...ast, caja: nextCaja });
  };

  const handleAddStep = () => {
    const nextStepNum = ast.montaje.length + 1;
    const newStep: PasoNode = {
      type: 'Paso',
      stepNumber: nextStepNum,
      description: `Ensamblar componente ${nextStepNum}`,
      body: [],
      loc: { line: 1, column: 1 },
    };
    onProgramChange({
      ...ast,
      montaje: [...ast.montaje, newStep],
    });
  };

  const handleUpdateStep = (idx: number, updated: PasoNode) => {
    const nextMontaje = [...ast.montaje];
    nextMontaje[idx] = updated;
    onProgramChange({ ...ast, montaje: nextMontaje });
  };

  const handleDeleteStep = (idx: number) => {
    const nextMontaje = [...ast.montaje];
    nextMontaje.splice(idx, 1);
    // Renumber steps
    const renumbered = nextMontaje.map((p, i) => ({ ...p, stepNumber: i + 1 }));
    onProgramChange({ ...ast, montaje: renumbered });
  };

  const handleAddSubStatement = (stepIdx: number, type: 'repetir' | 'si' | 'entre_dos' | 'unir') => {
    const step = ast.montaje[stepIdx];
    let newStmt: any;

    if (type === 'repetir') {
      newStmt = {
        type: 'Repetir',
        count: { type: 'Literal', valueType: 'TORNILLO', value: 4, loc: { line: 1, column: 1 } },
        body: [],
        loc: { line: 1, column: 1 },
      };
    } else if (type === 'si') {
      newStmt = {
        type: 'Si',
        condition: { type: 'Literal', valueType: 'ENCAJE', value: true, loc: { line: 1, column: 1 } },
        consequent: [],
        loc: { line: 1, column: 1 },
      };
    } else if (type === 'entre_dos') {
      newStmt = {
        type: 'EntreDos',
        body: [],
        loc: { line: 1, column: 1 },
      };
    } else {
      newStmt = {
        type: 'Assignment',
        target: ast.caja[0]?.name || 'pieza',
        value: { type: 'Literal', valueType: 'TABLERO', value: 'fijado', loc: { line: 1, column: 1 } },
        loc: { line: 1, column: 1 },
      };
    }

    const nextMontaje = [...ast.montaje];
    nextMontaje[stepIdx] = {
      ...step,
      body: [...step.body, newStmt],
    };
    onProgramChange({ ...ast, montaje: nextMontaje });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f4efe4] dark:bg-[#101b13] overflow-hidden select-none">
      {/* Top Banner Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#ede6d6] dark:bg-[#142318] border-b border-[#d8cca8] dark:border-[#213825]">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-[#0058a3] text-white dark:bg-[#ffdb00] dark:text-[#0e1b12] rounded-md font-black text-xs uppercase tracking-wider shadow-sm">
            {ast.mueble}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6e5d48] dark:text-[#8aa691]">
            <Box size={14} />
            <span>Piezas en Caja: <strong>{totalCajaPieces}</strong></span>
            <span className="mx-1">•</span>
            <Layers size={14} />
            <span>Pasos de Montaje: <strong>{ast.montaje.length}</strong></span>
          </div>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center gap-1 bg-[#ded3be] dark:bg-[#1b2f21] p-1 rounded-lg">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              selectedTab === 'all'
                ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                : 'text-[#6f5e4b] dark:text-[#88a38f]'
            }`}
          >
            Vista Completa
          </button>
          <button
            onClick={() => setSelectedTab('caja')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              selectedTab === 'caja'
                ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                : 'text-[#6f5e4b] dark:text-[#88a38f]'
            }`}
          >
            Solo CAJA
          </button>
          <button
            onClick={() => setSelectedTab('montaje')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              selectedTab === 'montaje'
                ? 'bg-white dark:bg-[#253f2c] text-[#0058a3] dark:text-[#ffdb00] shadow-sm'
                : 'text-[#6f5e4b] dark:text-[#88a38f]'
            }`}
          >
            Solo MONTAJE
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* SECTION 1: LA CAJA (Cardboard Box Flat-Pack Container) */}
        {(selectedTab === 'all' || selectedTab === 'caja') && (
          <div className="bg-[#ede4d1] dark:bg-[#152319] border-2 border-dashed border-[#c2b294] dark:border-[#2b4832] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#d4c3a3] dark:bg-[#1d3323] text-[#6b583f] dark:text-[#8ab095] rounded-xl shadow-inner">
                  <Box size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#383126] dark:text-[#e4efe6] tracking-tight">
                    LA CAJA (The Flat-Pack Hardware Box)
                  </h3>
                  <p className="text-xs text-[#7e6d59] dark:text-[#839d8b]">
                    Piezas desempaquetadas listas para el ensamblaje. Principio Zero-Leftovers activo.
                  </p>
                </div>
              </div>

              {/* Add Hardware Dropdown Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAddVariable('TORNILLO')}
                  className="px-2.5 py-1.5 bg-[#d97706]/15 hover:bg-[#d97706]/25 text-[#9a4f00] dark:text-[#fbbf24] border border-[#d97706]/30 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={13} /> + TORNILLO
                </button>
                <button
                  onClick={() => handleAddVariable('TABLERO')}
                  className="px-2.5 py-1.5 bg-[#8b5e3c]/15 hover:bg-[#8b5e3c]/25 text-[#633e22] dark:text-[#e0b58e] border border-[#8b5e3c]/30 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={13} /> + TABLERO
                </button>
                <button
                  onClick={() => handleAddVariable('ENCAJE')}
                  className="px-2.5 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-800 dark:text-green-300 border border-green-500/30 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={13} /> + ENCAJE
                </button>
                <button
                  onClick={() => handleAddVariable('CAJON')}
                  className="px-2.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-800 dark:text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={13} /> + CAJON
                </button>
              </div>
            </div>

            {/* Hardware Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ast.caja.map((v, idx) => (
                <HardwareCard
                  key={idx}
                  variable={v}
                  onUpdate={(updated) => handleUpdateVariable(idx, updated)}
                  onDelete={() => handleDeleteVariable(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: EL MONTAJE (Assembly Manual Steps) */}
        {(selectedTab === 'all' || selectedTab === 'montaje') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0058a3]/10 dark:bg-[#ffdb00]/10 text-[#0058a3] dark:text-[#ffdb00] rounded-xl">
                  <Layers size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#383126] dark:text-[#e4efe6] tracking-tight">
                    EL MONTAJE (Guía de Pasos Secuenciales)
                  </h3>
                  <p className="text-xs text-[#7e6d59] dark:text-[#839d8b]">
                    Viñetas del folleto físico ejecutadas en riguroso orden correlativo.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAddStep}
                className="px-4 py-2 bg-[#0058a3] hover:bg-[#004785] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus size={15} /> Añadir Siguiente Paso
              </button>
            </div>

            {/* List of Steps */}
            <div className="space-y-4">
              {ast.montaje.map((paso, idx) => (
                <StepBlockCard
                  key={idx}
                  paso={paso}
                  isActive={activeStepIndex === idx}
                  onUpdate={(updated) => handleUpdateStep(idx, updated)}
                  onDelete={() => handleDeleteStep(idx)}
                  onAddSubStatement={(type) => handleAddSubStatement(idx, type)}
                  onExecutePaso={() => onExecutePaso && onExecutePaso(idx)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
