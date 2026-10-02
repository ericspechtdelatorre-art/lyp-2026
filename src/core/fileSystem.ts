// ============================================================================
// IKEALang v1.1 - Hierarchical Virtual File System (Files & Directories)
// ============================================================================

import { SAMPLE_PROGRAMS } from './samplePrograms.ts';

export interface FSItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  parentId: string | null; // null represents workspace root
  content: string; // empty string for directories
  isOpen?: boolean; // expanded/collapsed for directories
  isReadOnly?: boolean;
}

const STORAGE_KEY = 'ikealang_virtual_fs_v3';

export function createInitialFileSystem(): FSItem[] {
  const items: FSItem[] = [];

  // 1. Root User File: main.ikea (clean starting file)
  items.push({
    id: 'root-main-ikea',
    name: 'main.ikea',
    type: 'file',
    parentId: null,
    content: `MUEBLE MiMuebleNuevo

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
}

CAJA {
    TABLERO estructura = "Estructura Base"
    TORNILLO fijaciones = 4
}

MONTAJE {
    PASO 1: "Desembalar y preparar piezas" {
        IMPRESORA.ESCRIBIR("Iniciando montaje de: " UNIR estructura)
    }

    PASO 2: "Ajustar fijaciones" {
        fijaciones = fijaciones RETIRAR 4
        IMPRESORA.ESCRIBIR("Fijaciones aseguradas.")
    }
}

TERMINADO estructura;
`,
  });

  // 2. Folder: "ejemplos" (Preserving all original sample programs inside this folder!)
  const ejemplosFolderId = 'folder-ejemplos';
  items.push({
    id: ejemplosFolderId,
    name: 'ejemplos',
    type: 'directory',
    parentId: null,
    content: '',
    isOpen: true,
  });

  // Store all samples inside "ejemplos/"
  SAMPLE_PROGRAMS.forEach((sample, idx) => {
    const filename = `${sample.name.replace(/[^a-zA-Z0-9]/g, '')}.ikea`;
    items.push({
      id: `sample-${sample.id}`,
      name: filename,
      type: 'file',
      parentId: ejemplosFolderId,
      content: sample.code,
      isReadOnly: false,
    });
  });

  return items;
}

export function loadFileSystem(): FSItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading file system from localStorage:', err);
  }
  return createInitialFileSystem();
}

export function saveFileSystem(items: FSItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving file system to localStorage:', err);
  }
}
