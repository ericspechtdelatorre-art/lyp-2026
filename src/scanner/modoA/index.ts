// ============================================================================
// Modo A public API
// ============================================================================

export * from './spatialTypes.ts';
export {
  normalizeScanResult,
  scanResultToGraph,
  synthesizeIkeaFromScanResult,
} from './scanContract.ts';
export type {
  FurnitureScanResult,
  ScannedComponent,
  HardwareInventory,
  ScanComponentType,
} from './scanContract.ts';
export * from './geometricDeconstruction.ts';
export * from './assemblyGraph.ts';
export * from './codeSynthesizer.ts';
export * from './pipeline.ts';
export { AssemblyTwinViewport } from './AssemblyTwinViewport.tsx';
