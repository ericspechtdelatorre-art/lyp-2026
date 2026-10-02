// ============================================================================
// IKEALang v1.1 - Hardware Blocks Geometry, Connectors & Physical Metaphors
// ============================================================================

import { IkeaType } from '../core/types.ts';

export interface BlockConnector {
  id: string;
  name: string;
  type: IkeaType;
  shape: 'threaded-screw' | 'tongue-groove' | 'snap-lock' | 'drawer-runner' | 'wooden-dowel';
  gender: 'male' | 'female';
}

export const CONNECTOR_SPECS: Record<IkeaType, { shape: BlockConnector['shape']; color: string; label: string; icon: string }> = {
  TORNILLO: {
    shape: 'threaded-screw',
    color: '#d97706', // Brass / Metallic Amber
    label: 'Rosca Métrica (Tornillo)',
    icon: '⚙️',
  },
  TABLERO: {
    shape: 'tongue-groove',
    color: '#8b5e3c', // Birch Oak Wood
    label: 'Espiga Ranurada (Tablero)',
    icon: '🪵',
  },
  ENCAJE: {
    shape: 'snap-lock',
    color: '#16a34a', // Emerald click joint
    label: 'Cierre Clic (Encaje)',
    icon: '🔒',
  },
  CAJON: {
    shape: 'drawer-runner',
    color: '#0284c7', // Steel drawer runner
    label: 'Guía Deslizante (Cajón)',
    icon: '🗄️',
  },
  FALTANTE: {
    shape: 'wooden-dowel',
    color: '#94a3b8',
    label: 'Hueco Vacío (Faltante)',
    icon: '⭕',
  },
  HUECO: {
    shape: 'wooden-dowel',
    color: '#64748b',
    label: 'Sin Retorno (Hueco)',
    icon: '∅',
  },
};

// Check physical joint compatibility at drag-time
export function areConnectorsCompatible(fromType: IkeaType, toType: IkeaType): boolean {
  if (fromType === toType) return true;
  // Can only convert if explicit
  return false;
}
