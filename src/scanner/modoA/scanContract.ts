// ============================================================================
// Modo A — JSON Contract (Python Vision Engine ↔ TypeScript IDE)
// ============================================================================

import { dtoToAssemblyGraph, FurnitureScanResultDTO, ScannedPrimitiveDTO } from './spatialTypes.ts';
import type { AssemblyGraph } from './spatialTypes.ts';
import { synthesizeFromScanDTO } from './codeSynthesizer.ts';

export type ScanComponentType = 'TABLERO' | 'PATA' | 'CAJON' | 'TORNILLO';

export interface ScannedComponent {
  id: string;
  label: string;
  type: ScanComponentType;
  dimensions_mm: [number, number, number];
  center_point: [number, number, number];
  color_hex?: string;
}

export interface AssemblyStepDTO {
  step_index: number;
  description: string;
  action: 'COLECCIONAR' | 'UNIR' | 'COLOCAR';
  parent_id?: string;
  children_ids: string[];
  fasteners_used?: number;
  requires_two_people: boolean;
}

export interface HardwareInventory {
  tableros: ScannedComponent[];
  tornillos_soportes: ScannedComponent[];
  cajones: ScannedComponent[];
}

export interface FurnitureScanResult {
  scan_id: string;
  furniture_type: string;
  suggested_name: string;
  confidence: number;
  hardware_inventory: HardwareInventory;
  assembly_hierarchy: AssemblyStepDTO[];
  mesh_export_url?: string;
  primitives?: ScannedPrimitiveDTO[];
  joints?: FurnitureScanResultDTO['joints'];
  source_code?: string | null;
  message?: string | null;
}

function componentToPrimitive(c: ScannedComponent): ScannedPrimitiveDTO {
  const kind =
    c.type === 'PATA' || c.type === 'TORNILLO'
      ? 'TORNILLO'
      : c.type === 'CAJON'
        ? 'CAJON'
        : 'TABLERO';
  return {
    id: c.id,
    label: c.label,
    primitive_type: kind,
    dimensions_mm: c.dimensions_mm,
    center_point: c.center_point,
    normal_vector: [0, 1, 0],
    material_tone: c.color_hex || '#d4a373',
    confidence: 0.9,
  };
}

/** Normalize inventory-shaped or legacy flat payloads into FurnitureScanResultDTO. */
export function normalizeScanResult(
  raw: FurnitureScanResult | FurnitureScanResultDTO
): FurnitureScanResultDTO {
  const asNew = raw as FurnitureScanResult;
  if (asNew.hardware_inventory) {
    const inv = asNew.hardware_inventory;
    const primitives: ScannedPrimitiveDTO[] =
      asNew.primitives && asNew.primitives.length > 0
        ? asNew.primitives
        : [
            ...inv.tableros.map(componentToPrimitive),
            ...inv.tornillos_soportes.map(componentToPrimitive),
            ...inv.cajones.map(componentToPrimitive),
          ];

    const joints =
      asNew.joints && asNew.joints.length > 0
        ? asNew.joints
        : asNew.assembly_hierarchy.flatMap((s) =>
            s.parent_id
              ? s.children_ids.map((cid) => ({
                  parent_id: s.parent_id as string,
                  child_id: cid,
                  contact_type: 'APOYO' as const,
                  normal: [0, 1, 0] as [number, number, number],
                }))
              : []
          );

    return {
      scan_id: asNew.scan_id,
      furniture_type: asNew.furniture_type,
      suggested_name: asNew.suggested_name,
      confidence: asNew.confidence,
      primitives,
      joints,
      assembly_hierarchy: asNew.assembly_hierarchy.map((s) => ({
        step_index: s.step_index,
        description: s.description,
        action: s.action === 'COLECCIONAR' ? 'COLECCIONAR' : 'UNIR',
        parent_id: s.parent_id ?? null,
        children_ids: s.children_ids,
        fasteners_used: s.fasteners_used ?? 0,
        requires_two_people: s.requires_two_people,
      })),
      source_code: asNew.source_code,
      message: asNew.message,
    };
  }

  return raw as FurnitureScanResultDTO;
}

export function scanResultToGraph(
  result: FurnitureScanResult | FurnitureScanResultDTO
): AssemblyGraph {
  return dtoToAssemblyGraph(normalizeScanResult(result));
}

export function synthesizeIkeaFromScanResult(
  result: FurnitureScanResult | FurnitureScanResultDTO
) {
  return synthesizeFromScanDTO(normalizeScanResult(result));
}
