# ============================================================================
# KALLAX Studio — Shared Spatial JSON Contract (Pydantic)
# ============================================================================

from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field


ComponentType = Literal["TABLERO", "PATA", "CAJON", "TORNILLO"]
PrimitiveType = Literal["TABLERO", "TORNILLO", "CAJON"]
ActionType = Literal["COLECCIONAR", "UNIR", "COLOCAR"]
ContactType = Literal["APOYO", "ENCAJE", "ATORNILLADO"]


class ScannedComponent(BaseModel):
    """Hardware inventory entry (spec contract)."""

    id: str
    label: str
    type: ComponentType
    dimensions_mm: Tuple[float, float, float] = Field(
        ..., description="[width, height, depth] mm"
    )
    center_point: Tuple[float, float, float] = Field(
        ..., description="[x, y, z] mm"
    )
    color_hex: Optional[str] = "#d4a373"


class ScannedPrimitive(BaseModel):
    """Legacy flat primitive (TS FurnitureScanResultDTO bridge)."""

    id: str
    label: str
    primitive_type: PrimitiveType
    dimensions_mm: List[float] = Field(..., description="[width, height, depth] mm")
    center_point: List[float] = Field(..., description="[x, y, z] mm")
    normal_vector: List[float] = Field(default_factory=lambda: [0.0, 1.0, 0.0])
    material_tone: Optional[str] = "#d4a373"
    confidence: float = 1.0
    component_type: Optional[ComponentType] = None


class ContactJoint(BaseModel):
    parent_id: str
    child_id: str
    contact_type: ContactType
    normal: List[float] = Field(default_factory=lambda: [0.0, 1.0, 0.0])


class AssemblyStepDTO(BaseModel):
    step_index: int
    description: str
    action: ActionType
    parent_id: Optional[str] = None
    children_ids: List[str] = Field(default_factory=list)
    fasteners_used: int = 0
    requires_two_people: bool = False


class HardwareInventory(BaseModel):
    tableros: List[ScannedComponent] = Field(default_factory=list)
    tornillos_soportes: List[ScannedComponent] = Field(default_factory=list)
    cajones: List[ScannedComponent] = Field(default_factory=list)


class FurnitureScanResult(BaseModel):
    """Canonical response for POST /api/scan/analyze."""

    scan_id: str
    furniture_type: str
    suggested_name: str
    confidence: float
    hardware_inventory: HardwareInventory
    assembly_hierarchy: List[AssemblyStepDTO]
    mesh_export_url: Optional[str] = None
    # Flat mirrors for existing TS synthesizer / dtoToAssemblyGraph
    primitives: List[ScannedPrimitive] = Field(default_factory=list)
    joints: List[ContactJoint] = Field(default_factory=list)
    source_code: Optional[str] = None
    message: Optional[str] = None


# Alias kept for older clients
ScanResponse = FurnitureScanResult
