// ============================================================================
// Scanner API — Python Vision Engine bridge (http://127.0.0.1:8000)
// Falls back to local mock when backend is offline.
// ============================================================================

import {
  FurnitureScanResult,
  normalizeScanResult,
} from './modoA/scanContract.ts';
import { FurnitureScanResultDTO } from './modoA/spatialTypes.ts';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

export interface BackendHealthStatus {
  ok: boolean;
  service?: string;
  version?: string;
  open3d_available?: boolean;
  trimesh_available?: boolean;
  mode?: 'python' | 'mock';
  error?: string;
}

export class ScannerApiClient {
  private baseUrl: string;
  private lastUsedMock = false;

  constructor(baseUrl: string = DEFAULT_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  didUseMockFallback() {
    return this.lastUsedMock;
  }

  async checkHealth(): Promise<BackendHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${this.baseUrl}/api/scan/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        return {
          ok: true,
          mode: 'python',
          service: data.service,
          version: data.version,
          open3d_available: data.open3d_available,
          trimesh_available: data.trimesh_available,
        };
      }
      return { ok: false, mode: 'mock', error: `HTTP ${resp.status}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Servidor Python no disponible';
      return { ok: false, mode: 'mock', error: message };
    }
  }

  /**
   * POST /api/scan/analyze — primary analyze endpoint (mesh or image).
   */
  async analyze(file: File | Blob, filename?: string): Promise<FurnitureScanResultDTO> {
    const actualName = filename || (file instanceof File ? file.name : 'scan.obj');
    const formData = new FormData();
    formData.append('file', file, actualName);

    try {
      const resp = await fetch(`${this.baseUrl}/api/scan/analyze`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(`Vision engine (${resp.status}): ${detail}`);
      }
      const raw = (await resp.json()) as FurnitureScanResult;
      this.lastUsedMock = false;
      return normalizeScanResult(raw);
    } catch (err) {
      console.warn('[ScannerApi] Backend offline — using mock engine.', err);
      this.lastUsedMock = true;
      return this.generateFallbackMock(actualName);
    }
  }

  async uploadScanMesh(file: File | Blob, filename = 'scan.obj'): Promise<FurnitureScanResultDTO> {
    return this.analyze(file, file instanceof File ? file.name : filename);
  }

  async uploadScanImage(file: File | Blob, filename = 'frame.png'): Promise<FurnitureScanResultDTO> {
    return this.analyze(file, file instanceof File ? file.name : filename);
  }

  async uploadScanToBackend(file: File | Blob): Promise<FurnitureScanResultDTO> {
    return this.analyze(file, file instanceof File ? file.name : 'upload.bin');
  }

  async fetchSample(furnitureType: string): Promise<FurnitureScanResultDTO> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/api/sample/${encodeURIComponent(furnitureType)}`
      );
      if (resp.ok) {
        this.lastUsedMock = false;
        return normalizeScanResult((await resp.json()) as FurnitureScanResult);
      }
    } catch {
      /* fall through */
    }
    this.lastUsedMock = true;
    return this.generateFallbackMock(furnitureType);
  }

  private generateFallbackMock(nameHint: string): FurnitureScanResultDTO {
    const hint = nameHint.toLowerCase();
    const isShelf =
      hint.includes('kallax') || hint.includes('estanter') || hint.includes('shelf');
    const isDrawer = hint.includes('cajon') || hint.includes('alex');
    const isChair = hint.includes('silla') || hint.includes('chair');

    if (isShelf) {
      return normalizeScanResult({
        scan_id: `mock_shelf_${Date.now()}`,
        furniture_type: 'Estantería',
        suggested_name: 'EstanteriaEscaneada',
        confidence: 0.7,
        hardware_inventory: {
          tableros: [
            {
              id: 'base',
              label: 'Base_Inferior',
              type: 'TABLERO',
              dimensions_mm: [342, 12, 162],
              center_point: [0, 6, 0],
              color_hex: '#d4b896',
            },
            {
              id: 'mid',
              label: 'Balda_Central',
              type: 'TABLERO',
              dimensions_mm: [310, 12, 154],
              center_point: [0, 190, 0],
              color_hex: '#b8956a',
            },
            {
              id: 'top',
              label: 'Tablero_Superior',
              type: 'TABLERO',
              dimensions_mm: [342, 12, 162],
              center_point: [0, 374, 0],
              color_hex: '#d4b896',
            },
            {
              id: 'left',
              label: 'Lateral_Izq',
              type: 'TABLERO',
              dimensions_mm: [14, 380, 162],
              center_point: [-164, 190, 0],
              color_hex: '#d4a373',
            },
            {
              id: 'right',
              label: 'Lateral_Der',
              type: 'TABLERO',
              dimensions_mm: [14, 380, 162],
              center_point: [164, 190, 0],
              color_hex: '#d4a373',
            },
          ],
          tornillos_soportes: [],
          cajones: [],
        },
        assembly_hierarchy: [
          {
            step_index: 1,
            description: 'Anclar Base_Inferior',
            action: 'COLOCAR',
            children_ids: ['base'],
            requires_two_people: false,
          },
          {
            step_index: 2,
            description: 'Unir laterales',
            action: 'UNIR',
            parent_id: 'base',
            children_ids: ['left', 'right'],
            fasteners_used: 8,
            requires_two_people: false,
          },
          {
            step_index: 3,
            description: 'Colocar Balda_Central',
            action: 'UNIR',
            parent_id: 'left',
            children_ids: ['mid'],
            fasteners_used: 4,
            requires_two_people: false,
          },
          {
            step_index: 4,
            description: 'Cerrar con Tablero_Superior',
            action: 'UNIR',
            parent_id: 'left',
            children_ids: ['top'],
            fasteners_used: 4,
            requires_two_people: true,
          },
        ],
        message: 'Mock engine (Python offline)',
      });
    }

    if (isChair) {
      return normalizeScanResult({
        scan_id: `mock_chair_${Date.now()}`,
        furniture_type: 'Silla',
        suggested_name: 'SillaEscaneada',
        confidence: 0.7,
        hardware_inventory: {
          tableros: [
            {
              id: 'seat',
              label: 'Asiento',
              type: 'TABLERO',
              dimensions_mm: [420, 30, 400],
              center_point: [0, 450, 0],
              color_hex: '#c4a574',
            },
            {
              id: 'back',
              label: 'Respaldo',
              type: 'TABLERO',
              dimensions_mm: [420, 480, 25],
              center_point: [0, 700, -180],
              color_hex: '#b8956a',
            },
          ],
          tornillos_soportes: [
            {
              id: 'l1',
              label: 'Pata_FL',
              type: 'PATA',
              dimensions_mm: [35, 450, 35],
              center_point: [-170, 225, 150],
              color_hex: '#8b6914',
            },
            {
              id: 'l2',
              label: 'Pata_FR',
              type: 'PATA',
              dimensions_mm: [35, 450, 35],
              center_point: [170, 225, 150],
              color_hex: '#8b6914',
            },
            {
              id: 'l3',
              label: 'Pata_BL',
              type: 'PATA',
              dimensions_mm: [35, 450, 35],
              center_point: [-170, 225, -150],
              color_hex: '#8b6914',
            },
            {
              id: 'l4',
              label: 'Pata_BR',
              type: 'PATA',
              dimensions_mm: [35, 450, 35],
              center_point: [170, 225, -150],
              color_hex: '#8b6914',
            },
          ],
          cajones: [],
        },
        assembly_hierarchy: [
          {
            step_index: 1,
            description: 'Fijar 4 patas',
            action: 'UNIR',
            children_ids: ['l1', 'l2', 'l3', 'l4'],
            fasteners_used: 8,
            requires_two_people: false,
          },
          {
            step_index: 2,
            description: 'Colocar Asiento',
            action: 'UNIR',
            parent_id: 'l1',
            children_ids: ['seat'],
            fasteners_used: 4,
            requires_two_people: false,
          },
          {
            step_index: 3,
            description: 'Unir Respaldo',
            action: 'UNIR',
            parent_id: 'seat',
            children_ids: ['back'],
            fasteners_used: 4,
            requires_two_people: false,
          },
        ],
        message: 'Mock engine (Python offline)',
      });
    }

    if (isDrawer) {
      return normalizeScanResult({
        scan_id: `mock_drawer_${Date.now()}`,
        furniture_type: 'Cajonera',
        suggested_name: 'CajoneraEscaneada',
        confidence: 0.7,
        hardware_inventory: {
          tableros: [
            {
              id: 'frame',
              label: 'Chasis',
              type: 'TABLERO',
              dimensions_mm: [360, 700, 480],
              center_point: [0, 350, 0],
              color_hex: '#f5f5f0',
            },
          ],
          tornillos_soportes: [],
          cajones: [
            {
              id: 'd1',
              label: 'Cajon_1',
              type: 'CAJON',
              dimensions_mm: [320, 110, 400],
              center_point: [0, 120, 40],
              color_hex: '#e0ddd4',
            },
            {
              id: 'd2',
              label: 'Cajon_2',
              type: 'CAJON',
              dimensions_mm: [320, 110, 400],
              center_point: [0, 250, 40],
              color_hex: '#e0ddd4',
            },
          ],
        },
        assembly_hierarchy: [
          {
            step_index: 1,
            description: 'Anclar Chasis',
            action: 'COLOCAR',
            children_ids: ['frame'],
            requires_two_people: true,
          },
          {
            step_index: 2,
            description: 'Insertar cajones',
            action: 'UNIR',
            parent_id: 'frame',
            children_ids: ['d1', 'd2'],
            requires_two_people: false,
          },
        ],
        message: 'Mock engine (Python offline)',
      });
    }

    // default table
    return normalizeScanResult({
      scan_id: `mock_table_${Date.now()}`,
      furniture_type: 'Mesa',
      suggested_name: 'MesaEscaneada',
      confidence: 0.7,
      hardware_inventory: {
        tableros: [
          {
            id: 'top',
            label: 'Tablero_Superior',
            type: 'TABLERO',
            dimensions_mm: [550, 40, 550],
            center_point: [0, 470, 0],
            color_hex: '#d4a373',
          },
        ],
        tornillos_soportes: [
          {
            id: 'p1',
            label: 'Pata_FL',
            type: 'PATA',
            dimensions_mm: [45, 450, 45],
            center_point: [-220, 225, 220],
            color_hex: '#c0c0c0',
          },
          {
            id: 'p2',
            label: 'Pata_FR',
            type: 'PATA',
            dimensions_mm: [45, 450, 45],
            center_point: [220, 225, 220],
            color_hex: '#c0c0c0',
          },
          {
            id: 'p3',
            label: 'Pata_BL',
            type: 'PATA',
            dimensions_mm: [45, 450, 45],
            center_point: [-220, 225, -220],
            color_hex: '#c0c0c0',
          },
          {
            id: 'p4',
            label: 'Pata_BR',
            type: 'PATA',
            dimensions_mm: [45, 450, 45],
            center_point: [220, 225, -220],
            color_hex: '#c0c0c0',
          },
        ],
        cajones: [],
      },
      assembly_hierarchy: [
        {
          step_index: 1,
          description: 'Fijar 4 patas',
          action: 'UNIR',
          children_ids: ['p1', 'p2', 'p3', 'p4'],
          fasteners_used: 8,
          requires_two_people: false,
        },
        {
          step_index: 2,
          description: 'Colocar tablero',
          action: 'UNIR',
          parent_id: 'p1',
          children_ids: ['top'],
          fasteners_used: 4,
          requires_two_people: true,
        },
      ],
      message: 'Mock engine (Python offline)',
    });
  }
}

export const scannerApi = new ScannerApiClient();
