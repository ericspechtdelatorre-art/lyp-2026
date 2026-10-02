// ============================================================================
// IKEALang v1.2 - Real Desktop File System Bridge & Workspace Storage
// Supports real file import/export via File System Access API & Blob Fallback
// (main.ikea has been completely removed)
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
  isRealDisk?: boolean;
}

const STORAGE_KEY = 'ikealang_virtual_fs_v4';

export function createInitialFileSystem(): FSItem[] {
  const items: FSItem[] = [];

  // Folder: "ejemplos" (Official Universal Furniture Samples)
  const ejemplosFolderId = 'folder-ejemplos';
  items.push({
    id: ejemplosFolderId,
    name: 'ejemplos',
    type: 'directory',
    parentId: null,
    content: '',
    isOpen: true,
  });

  // Populate samples
  SAMPLE_PROGRAMS.forEach((sample) => {
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
        // Ensure main.ikea is purged if present in any legacy cache
        const filtered = parsed.filter(i => i.name !== 'main.ikea');
        if (filtered.length > 0) return filtered;
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

// ============================================================================
// REAL DESKTOP FILE SYSTEM INTEGRATION (Import / Export on Windows / OS disk)
// ============================================================================

/**
 * Export a real file to the user's computer disk (.ikea)
 */
export async function exportRealFileToDisk(fileName: string, content: string): Promise<boolean> {
  const safeName = fileName.endsWith('.ikea') ? fileName : `${fileName}.ikea`;

  // 1. Try modern File System Access API (Native Windows Save Dialog)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: safeName,
        types: [
          {
            description: 'Archivo IkeaLang (*.ikea)',
            accept: {
              'text/plain': ['.ikea', '.txt'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false; // user cancelled
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // 2. Universal Blob Download fallback
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error downloading file:', err);
    return false;
  }
}

/**
 * Import a real file from the user's computer disk (.ikea)
 */
export async function importRealFileFromDisk(): Promise<{ name: string; content: string } | null> {
  // 1. Try modern File System Access API (Native Windows Open Dialog)
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Archivos IkeaLang (*.ikea)',
            accept: {
              'text/plain': ['.ikea', '.txt'],
            },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await file.text();
      return { name: file.name, content };
    } catch (err: any) {
      if (err.name === 'AbortError') return null; // user cancelled
      console.warn('showOpenFilePicker failed, falling back to input:', err);
    }
  }

  // 2. Universal File Input Dialog fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ikea,.txt';
    input.style.display = 'none';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            content: String(reader.result || ''),
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      } catch (err) {
        console.error('FileReader error:', err);
        resolve(null);
      }
    };

    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      document.body.removeChild(input);
    }, 1000);
  });
}

/**
 * Open a real directory from Windows disk and read all .ikea files inside
 */
export async function openRealDirectoryFromDisk(): Promise<FSItem[] | null> {
  if (!('showDirectoryPicker' in window)) {
    alert('Tu entorno actual no soporta abrir carpetas completas del sistema. Usa "Importar Archivo" para abrir ficheros individuales.');
    return null;
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker();
    const items: FSItem[] = [];

    const rootDirId = `dir-${dirHandle.name}-${Date.now()}`;
    items.push({
      id: rootDirId,
      name: dirHandle.name,
      type: 'directory',
      parentId: null,
      content: '',
      isOpen: true,
      isRealDisk: true,
    });

    // Helper to read entries
    async function readDirectory(handle: any, parentId: string) {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          if (entry.name.endsWith('.ikea') || entry.name.endsWith('.txt')) {
            const file = await entry.getFile();
            const content = await file.text();
            items.push({
              id: `file-${entry.name}-${Date.now()}-${Math.random()}`,
              name: entry.name,
              type: 'file',
              parentId: parentId,
              content,
              isRealDisk: true,
            });
          }
        } else if (entry.kind === 'directory') {
          const subDirId = `dir-${entry.name}-${Date.now()}-${Math.random()}`;
          items.push({
            id: subDirId,
            name: entry.name,
            type: 'directory',
            parentId: parentId,
            content: '',
            isOpen: true,
            isRealDisk: true,
          });
          await readDirectory(entry, subDirId);
        }
      }
    }

    await readDirectory(dirHandle, rootDirId);
    return items;
  } catch (err: any) {
    if (err.name === 'AbortError') return null; // user cancelled
    console.error('Error opening directory:', err);
    return null;
  }
}
