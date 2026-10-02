// ============================================================================
// IKEALang v1.1 - VS Code Sidebar Explorer (Hierarchical Files & Directories)
// ============================================================================

import React, { useState } from 'react';
import { FSItem } from '../core/fileSystem.ts';
import { ProgramNode } from '../core/types.ts';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  Box,
  Wrench,
  CheckCircle,
  FileCode,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface SidebarExplorerProps {
  items: FSItem[];
  activeFileId: string | null;
  onSelectFile: (file: FSItem) => void;
  onCreateItem: (name: string, type: 'file' | 'directory', parentId: string | null) => void;
  onDeleteItem: (id: string) => void;
  onToggleDirectory: (id: string) => void;
  onResetFileSystem: () => void;
  ast: ProgramNode | null;
}

export const SidebarExplorer: React.FC<SidebarExplorerProps> = ({
  items,
  activeFileId,
  onSelectFile,
  onCreateItem,
  onDeleteItem,
  onToggleDirectory,
  onResetFileSystem,
  ast,
}) => {
  const [outlineOpen, setOutlineOpen] = useState(true);

  // Creation state
  const [creationMode, setCreationMode] = useState<{
    type: 'file' | 'directory';
    parentId: string | null;
  } | null>(null);
  const [creationName, setCreationName] = useState('');

  // Handle create submission
  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!creationMode) return;

    let name = creationName.trim();
    if (!name) {
      name = creationMode.type === 'file' ? 'nuevo_mueble.ikea' : 'nueva_carpeta';
    }

    if (creationMode.type === 'file' && !name.includes('.')) {
      name += '.ikea';
    }

    onCreateItem(name, creationMode.type, creationMode.parentId);
    setCreationName('');
    setCreationMode(null);
  };

  // Render a directory level recursively
  const renderTreeLevel = (parentId: string | null, depth = 0) => {
    const children = items.filter((item) => item.parentId === parentId);

    // Sort: directories first, then files
    const sorted = [...children].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-0.5">
        {/* Inline Creator if active for this parent */}
        {creationMode && creationMode.parentId === parentId && (
          <form
            onSubmit={handleCreateSubmit}
            style={{ paddingLeft: `${depth * 14 + 16}px` }}
            className="pr-2 py-1 flex items-center gap-1.5 bg-[#37373d]/40"
          >
            {creationMode.type === 'directory' ? (
              <Folder size={14} className="text-[#dcb67a] shrink-0" />
            ) : (
              <span className="text-xs shrink-0 text-[#ffdb00]">🪑</span>
            )}
            <input
              type="text"
              autoFocus
              placeholder={creationMode.type === 'file' ? 'archivo.ikea' : 'carpeta'}
              value={creationName}
              onChange={(e) => setCreationName(e.target.value)}
              onBlur={() => {
                if (creationName.trim()) {
                  handleCreateSubmit();
                } else {
                  setCreationMode(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCreationMode(null);
              }}
              className="flex-1 bg-[#1e1e1e] text-white font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#007acc] outline-none"
            />
          </form>
        )}

        {sorted.map((item) => {
          if (item.type === 'directory') {
            const isExpanded = item.isOpen ?? true;
            return (
              <div key={item.id}>
                <div
                  style={{ paddingLeft: `${depth * 14 + 8}px` }}
                  onClick={() => onToggleDirectory(item.id)}
                  className="w-full pr-2 py-1 flex items-center justify-between font-semibold text-[11px] hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white rounded cursor-pointer group"
                >
                  <div className="flex items-center gap-1 truncate">
                    {isExpanded ? (
                      <ChevronDown size={13} className="shrink-0 text-[#858585]" />
                    ) : (
                      <ChevronRight size={13} className="shrink-0 text-[#858585]" />
                    )}
                    {isExpanded ? (
                      <FolderOpen size={14} className="text-[#007acc] shrink-0" />
                    ) : (
                      <Folder size={14} className="text-[#dcb67a] shrink-0" />
                    )}
                    <span className="truncate font-mono">{item.name}</span>
                  </div>

                  {/* Actions on folder hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationMode({ type: 'file', parentId: item.id });
                        if (!isExpanded) onToggleDirectory(item.id);
                      }}
                      className="p-1 hover:bg-[#37373d] text-[#aaaaaa] hover:text-white rounded"
                      title="Nuevo archivo dentro de esta carpeta"
                    >
                      <FilePlus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationMode({ type: 'directory', parentId: item.id });
                        if (!isExpanded) onToggleDirectory(item.id);
                      }}
                      className="p-1 hover:bg-[#37373d] text-[#aaaaaa] hover:text-white rounded"
                      title="Nueva subcarpeta"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar la carpeta '${item.name}' y todo su contenido?`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1 hover:bg-[#37373d] text-red-400 hover:text-red-300 rounded"
                      title="Eliminar carpeta"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sub-level */}
                {isExpanded && renderTreeLevel(item.id, depth + 1)}
              </div>
            );
          }

          // File Item
          const isSelected = activeFileId === item.id;
          const isIkea = item.name.endsWith('.ikea');

          return (
            <div
              key={item.id}
              style={{ paddingLeft: `${depth * 14 + 18}px` }}
              onClick={() => onSelectFile(item)}
              className={`w-full pr-2 py-1 rounded flex items-center justify-between cursor-pointer group transition-colors ${
                isSelected
                  ? 'bg-[#37373d] text-white font-semibold'
                  : 'hover:bg-[#2a2d2e] text-[#cccccc]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isIkea ? (
                  <span className="text-[13px] leading-none shrink-0 text-[#ffdb00]">
                    🪑
                  </span>
                ) : (
                  <FileText size={13} className="text-[#858585] shrink-0" />
                )}
                <span className="truncate font-mono text-[12px]">{item.name}</span>
              </div>

              {/* Actions on file hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 rounded hover:bg-neutral-800 transition-opacity"
                title="Eliminar archivo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-64 h-full bg-[#252526] border-r border-[#181818] flex flex-col text-[#cccccc] select-none text-xs shrink-0 overflow-hidden font-sans">
      {/* Explorer Header */}
      <div className="h-9 px-3 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#bbbbbb] border-b border-[#2d2d2d]">
        <span>EXPLORADOR</span>
        <div className="flex items-center gap-1">
          {/* New File at Root */}
          <button
            onClick={() => setCreationMode({ type: 'file', parentId: null })}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Nuevo archivo en la raíz (.ikea)"
          >
            <FilePlus size={15} />
          </button>
          {/* New Folder at Root */}
          <button
            onClick={() => setCreationMode({ type: 'directory', parentId: null })}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Nueva carpeta"
          >
            <FolderPlus size={15} />
          </button>
          {/* Reset FS */}
          <button
            onClick={() => {
              if (confirm('¿Restablecer el explorador al estado inicial?')) {
                onResetFileSystem();
              }
            }}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Restablecer archivos iniciales"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Workspace Root Node */}
        <div className="px-1 py-1 font-bold text-[11px] text-[#e7e7e7] tracking-wider uppercase flex items-center justify-between border-b border-[#2d2d2d]/60 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#007acc]">📁</span>
            <span>PROYECTO IKEALANG</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreationMode({ type: 'file', parentId: null })}
              className="p-0.5 hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded"
              title="Crear archivo en la raíz"
            >
              <FilePlus size={13} />
            </button>
            <button
              onClick={() => setCreationMode({ type: 'directory', parentId: null })}
              className="p-0.5 hover:bg-[#333333] text-[#aaaaaa] hover:text-white rounded"
              title="Crear carpeta en la raíz"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {/* Tree Content */}
        {renderTreeLevel(null)}

        {/* Outline Section */}
        {ast && (
          <div className="mt-4 border-t border-[#2d2d2d] pt-1">
            <button
              onClick={() => setOutlineOpen(!outlineOpen)}
              className="w-full px-2 py-1.5 flex items-center gap-1 font-bold text-[11px] hover:bg-[#2a2d2e] text-[#e7e7e7] tracking-wider uppercase"
            >
              {outlineOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>ESQUEMA DE MONTAJE</span>
            </button>

            {outlineOpen && (
              <div className="pl-4 pr-2 py-1 space-y-1 font-mono text-[11px] text-[#9cdcfe]">
                {/* Mueble */}
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="text-[#569cd6] font-bold">MUEBLE</span>
                  <span className="text-white font-bold">{ast.mueble}</span>
                </div>

                {/* Herramientas */}
                <div className="flex items-center gap-1.5 py-0.5">
                  <Wrench size={12} className="text-[#4fc1ff]" />
                  <span>HERRAMIENTAS ({ast.herramientas.length})</span>
                </div>

                {/* Caja */}
                <div className="flex items-center gap-1.5 py-0.5">
                  <Box size={12} className="text-[#d7ba7d]" />
                  <span>CAJA ({ast.caja.length} piezas)</span>
                </div>

                {/* Pasos */}
                <div className="pl-3 space-y-0.5 text-[#ce9178]">
                  {ast.montaje.map((paso) => (
                    <div key={paso.stepNumber} className="truncate py-0.5">
                      PASO {paso.stepNumber}: "{paso.description}"
                    </div>
                  ))}
                </div>

                {/* Terminado */}
                <div className="flex items-center gap-1.5 py-0.5 text-emerald-400">
                  <CheckCircle size={12} />
                  <span>TERMINADO</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
