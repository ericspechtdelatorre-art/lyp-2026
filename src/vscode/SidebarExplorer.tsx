// ============================================================================
// IKEALang v1.2 - VS Code Sidebar Explorer
// Real Desktop File Integration (Import/Export to Windows Disk & Open Local Folders)
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
  Upload,
  Download,
  HardDrive,
} from 'lucide-react';

interface SidebarExplorerProps {
  items: FSItem[];
  activeFileId: string | null;
  onSelectFile: (file: FSItem) => void;
  onCreateItem: (name: string, type: 'file' | 'directory', parentId: string | null) => void;
  onDeleteItem: (id: string) => void;
  onToggleDirectory: (id: string) => void;
  onResetFileSystem: () => void;
  onImportRealFile: () => void;
  onExportRealFile: () => void;
  onOpenRealFolder: () => void;
  onImportDroppedFile?: (name: string, content: string) => void;
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
  onImportRealFile,
  onExportRealFile,
  onOpenRealFolder,
  onImportDroppedFile,
  ast,
}) => {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Drag and Drop from Windows Explorer
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportDroppedFile) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.name.endsWith('.ikea') || file.name.endsWith('.txt')) {
          const content = await file.text();
          onImportDroppedFile(file.name, content);
        }
      }
    }
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
              onBlur={() => handleCreateSubmit()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCreationMode(null);
              }}
              className="bg-[#3c3c3c] text-white text-[11px] px-1.5 py-0.5 rounded outline-none border border-[#007acc] w-full"
            />
          </form>
        )}

        {sorted.map((item) => {
          // Directory Item
          if (item.type === 'directory') {
            const isExpanded = item.isOpen !== false;

            return (
              <div key={item.id} className="flex flex-col">
                <div
                  style={{ paddingLeft: `${depth * 14 + 6}px` }}
                  onClick={() => onToggleDirectory(item.id)}
                  className="w-full pr-2 py-1 rounded flex items-center justify-between hover:bg-[#2a2d2e] cursor-pointer group text-[#cccccc] hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1 truncate">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-[#858585] shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-[#858585] shrink-0" />
                    )}
                    {isExpanded ? (
                      <FolderOpen size={14} className="text-[#dcb67a] shrink-0" />
                    ) : (
                      <Folder size={14} className="text-[#dcb67a] shrink-0" />
                    )}
                    <span className="truncate font-semibold text-[12px]">{item.name}</span>
                    {item.isRealDisk && (
                      <span className="text-[9px] px-1 rounded bg-[#007acc]/20 text-[#007acc] font-mono ml-1">
                        DISCO
                      </span>
                    )}
                  </div>

                  {/* Actions on folder hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                    {/* Add file inside folder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationMode({ type: 'file', parentId: item.id });
                      }}
                      className="p-1 hover:bg-[#333333] hover:text-white rounded"
                      title="Nuevo archivo aquí (.ikea)"
                    >
                      <FilePlus size={12} />
                    </button>
                    {/* Add subfolder inside folder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationMode({ type: 'directory', parentId: item.id });
                      }}
                      className="p-1 hover:bg-[#333333] hover:text-white rounded"
                      title="Nueva subcarpeta"
                    >
                      <FolderPlus size={12} />
                    </button>
                    {/* Delete folder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar la carpeta '${item.name}' y todo su contenido?`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-[#333333] rounded"
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
                {item.isRealDisk && (
                  <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    REAL
                  </span>
                )}
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
    <aside
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-64 h-full bg-[#252526] border-r border-[#181818] flex flex-col text-[#cccccc] select-none text-xs shrink-0 overflow-hidden font-sans transition-colors ${
        isDragOver ? 'ring-2 ring-[#007acc] bg-[#2a2d3e]' : ''
      }`}
    >
      {/* Explorer Header */}
      <div className="h-9 px-3 flex items-center justify-between font-bold text-[11px] tracking-wider uppercase text-[#bbbbbb] border-b border-[#2d2d2d]">
        <span className="flex items-center gap-1.5">
          <HardDrive size={13} className="text-[#007acc]" />
          <span>EXPLORADOR</span>
        </span>
        <div className="flex items-center gap-1">
          {/* Import Real File from Disk */}
          <button
            onClick={onImportRealFile}
            className="p-1 hover:bg-[#333333] hover:text-[#007acc] rounded text-[#cccccc] transition-colors"
            title="Importar archivo real (.ikea) desde el ordenador"
          >
            <Upload size={14} />
          </button>
          {/* Open Real Directory from Disk */}
          <button
            onClick={onOpenRealFolder}
            className="p-1 hover:bg-[#333333] hover:text-[#ffdb00] rounded text-[#cccccc] transition-colors"
            title="Abrir carpeta local del ordenador"
          >
            <FolderOpen size={14} />
          </button>
          {/* Export Active File to Disk */}
          <button
            onClick={onExportRealFile}
            className="p-1 hover:bg-[#333333] hover:text-emerald-400 rounded text-[#cccccc] transition-colors"
            title="Guardar / Exportar archivo actual al disco (.ikea)"
          >
            <Download size={14} />
          </button>
          {/* New File at Root */}
          <button
            onClick={() => setCreationMode({ type: 'file', parentId: null })}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Nuevo archivo vacío (.ikea)"
          >
            <FilePlus size={14} />
          </button>
          {/* New Folder at Root */}
          <button
            onClick={() => setCreationMode({ type: 'directory', parentId: null })}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Nueva carpeta"
          >
            <FolderPlus size={14} />
          </button>
          {/* Reset FS */}
          <button
            onClick={() => {
              if (confirm('¿Restablecer el explorador al estado inicial?')) {
                onResetFileSystem();
              }
            }}
            className="p-1 hover:bg-[#333333] hover:text-white rounded text-[#cccccc] transition-colors"
            title="Restablecer ejemplos"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Workspace Root Node */}
        <div className="px-1 py-1 font-bold text-[11px] text-[#e7e7e7] tracking-wider uppercase flex items-center justify-between border-b border-[#2d2d2d]/60 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#007acc]">📁</span>
            <span>ESPACIO DE TRABAJO</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onImportRealFile}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-[#cccccc] flex items-center gap-1"
              title="Cargar archivo .ikea de tu disco"
            >
              <Upload size={10} />
              <span>Importar</span>
            </button>
            <button
              onClick={onExportRealFile}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[#007acc] hover:bg-[#0062a3] text-white flex items-center gap-1"
              title="Guardar archivo .ikea en tu disco"
            >
              <Download size={10} />
              <span>Guardar</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop notice */}
        {isDragOver && (
          <div className="p-3 my-2 border-2 border-dashed border-[#007acc] rounded-lg text-center text-[#007acc] bg-[#007acc]/10 font-mono text-[11px]">
            Suelta el archivo .ikea para importarlo directamente
          </div>
        )}

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

                {/* Caja (Variables) */}
                <div className="flex items-center gap-1.5 py-0.5">
                  <Box size={12} className="text-[#dcdcaa]" />
                  <span>CAJA ({ast.caja.length} piezas)</span>
                </div>

                {/* Pasos */}
                <div className="flex flex-col gap-1 py-0.5 pl-2 border-l border-[#333333]">
                  {ast.montaje.map((p) => (
                    <div key={p.stepNumber} className="flex items-center gap-1 text-[#ce9178] truncate">
                      <CheckCircle size={10} className="text-emerald-500 shrink-0" />
                      <span className="truncate">PASO {p.stepNumber}: {p.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
