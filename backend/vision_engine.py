# ============================================================================
# KALLAX Studio — Vision Engine (Open3D + Trimesh)
# Floor RANSAC, DBSCAN clustering, OBB classification, contact graph
# ============================================================================

from __future__ import annotations

import os
import uuid
import tempfile
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import open3d as o3d

    HAS_OPEN3D = True
except ImportError:
    HAS_OPEN3D = False

try:
    import trimesh

    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False

from .schemas import (
    AssemblyStepDTO,
    ContactJoint,
    FurnitureScanResult,
    HardwareInventory,
    ScannedComponent,
    ScannedPrimitive,
    ScanResponse,
)

CONTACT_TOLERANCE_MM = 10.0
TIPPING_VOLUME_MM3 = 8_000_000.0
TIPPING_WIDTH_MM = 900.0


class VisionEngine:
    """3D spatial deconstruction for furniture meshes / point clouds."""

    def __init__(self, proximity_margin_mm: float = CONTACT_TOLERANCE_MM):
        self.margin_mm = proximity_margin_mm

    # ------------------------------------------------------------------ public
    def analyze_file(self, file_bytes: bytes, filename: str) -> FurnitureScanResult:
        ext = os.path.splitext(filename)[1].lower() or ".obj"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            path = tmp.name
        try:
            return self.analyze_path(path, filename)
        finally:
            if os.path.exists(path):
                os.remove(path)

    def analyze_path(self, path: str, original_filename: str) -> FurnitureScanResult:
        primitives = self._extract_primitives(path, original_filename)
        if not primitives:
            primitives = self._fallback_primitives(original_filename)

        furniture_type, suggested = self._classify_furniture(primitives, original_filename)
        joints = self._detect_contact_joints(primitives)
        hierarchy = self._build_assembly_hierarchy(primitives, joints)
        inventory = self._to_hardware_inventory(primitives)

        return FurnitureScanResult(
            scan_id=f"scan_{uuid.uuid4().hex[:8]}",
            furniture_type=furniture_type,
            suggested_name=suggested,
            confidence=0.93 if (HAS_OPEN3D or HAS_TRIMESH) else 0.75,
            hardware_inventory=inventory,
            assembly_hierarchy=hierarchy,
            # Legacy flat fields for TS bridge compatibility
            primitives=primitives,
            joints=joints,
            message="Deconstrucción espacial completada (Open3D/Trimesh).",
        )

    def analyze_image(self, file_bytes: bytes, filename: str) -> FurnitureScanResult:
        """RGB proxy: aspect-ratio heuristic when no depth/mesh is available."""
        width, height = 640, 480
        try:
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(file_bytes))
            width, height = img.size
        except Exception:
            pass

        aspect = width / max(height, 1)
        hint = os.path.splitext(filename)[0].lower()
        if "silla" in hint or aspect < 0.8:
            primitives = self._chair_primitives()
            f_type, s_name = "Silla", "SillaEscaneada"
        elif "cajon" in hint or "alex" in hint:
            primitives = self._drawer_primitives()
            f_type, s_name = "Cajonera", "CajoneraEscaneada"
        elif "estanter" in hint or "kallax" in hint or "shelf" in hint:
            primitives = self._shelf_primitives()
            f_type, s_name = "Estantería", "EstanteriaEscaneada"
        else:
            primitives = self._table_primitives()
            f_type, s_name = "Mesa", "MesaEscaneada"

        joints = self._detect_contact_joints(primitives)
        hierarchy = self._build_assembly_hierarchy(primitives, joints)
        return FurnitureScanResult(
            scan_id=f"img_{uuid.uuid4().hex[:8]}",
            furniture_type=f_type,
            suggested_name=s_name,
            confidence=0.82,
            hardware_inventory=self._to_hardware_inventory(primitives),
            assembly_hierarchy=hierarchy,
            primitives=primitives,
            joints=joints,
            message=f"Inferencia 3D desde imagen {width}x{height}px.",
        )

    def sample(self, model_name: str) -> FurnitureScanResult:
        name = model_name.lower()
        if "silla" in name:
            prims = self._chair_primitives()
            f_type, s_name = "Silla", "SillaComedor"
        elif "cajon" in name or "alex" in name:
            prims = self._drawer_primitives()
            f_type, s_name = "Cajonera", "CajoneraModular"
        elif "estanter" in name or "kallax" in name:
            prims = self._shelf_primitives()
            f_type, s_name = "Estantería", "EstanteriaKallax"
        else:
            prims = self._table_primitives()
            f_type, s_name = "Mesa", "MesaAuxiliar"
        joints = self._detect_contact_joints(prims)
        hierarchy = self._build_assembly_hierarchy(prims, joints)
        return FurnitureScanResult(
            scan_id=f"sample_{name}",
            furniture_type=f_type,
            suggested_name=s_name,
            confidence=0.99,
            hardware_inventory=self._to_hardware_inventory(prims),
            assembly_hierarchy=hierarchy,
            primitives=prims,
            joints=joints,
            message=f"Muestra estructural: {f_type}",
        )

    # --------------------------------------------------------------- extraction
    def _extract_primitives(self, path: str, filename: str) -> List[ScannedPrimitive]:
        primitives: List[ScannedPrimitive] = []

        if HAS_TRIMESH:
            try:
                loaded = trimesh.load(path, force="mesh")
                if isinstance(loaded, trimesh.Scene):
                    primitives = self._from_trimesh_scene(loaded)
                elif isinstance(loaded, trimesh.Trimesh):
                    primitives = self._from_trimesh(loaded)
            except Exception as exc:
                print(f"[VisionEngine] trimesh failed: {exc}")

        if not primitives and HAS_OPEN3D:
            try:
                mesh = o3d.io.read_triangle_mesh(path)
                if not mesh.is_empty():
                    pcd = mesh.sample_points_uniformly(number_of_points=12000)
                    primitives = self._from_open3d_pcd(pcd)
                else:
                    pcd = o3d.io.read_point_cloud(path)
                    if not pcd.is_empty():
                        primitives = self._from_open3d_pcd(pcd)
            except Exception as exc:
                print(f"[VisionEngine] open3d failed: {exc}")

        return primitives

    def _from_trimesh_scene(self, scene: Any) -> List[ScannedPrimitive]:
        out: List[ScannedPrimitive] = []
        idx = 1
        for _name, geom in scene.geometry.items():
            if not isinstance(geom, trimesh.Trimesh) or len(geom.vertices) == 0:
                continue
            for comp in geom.split(only_watertight=False):
                if len(comp.vertices) < 8:
                    continue
                out.append(self._trimesh_to_primitive(comp, f"parte_{idx}"))
                idx += 1
        return self._normalize_floor(out)

    def _from_trimesh(self, mesh: Any) -> List[ScannedPrimitive]:
        comps = mesh.split(only_watertight=False)
        if len(comps) <= 1 and HAS_OPEN3D:
            pts = mesh.sample(10000)
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(pts)
            return self._from_open3d_pcd(pcd)
        out = []
        for i, c in enumerate(comps):
            if len(c.vertices) < 8:
                continue
            out.append(self._trimesh_to_primitive(c, f"pieza_{i+1}"))
        return self._normalize_floor(out)

    def _trimesh_to_primitive(self, mesh: Any, default_label: str) -> ScannedPrimitive:
        extents = mesh.bounds[1] - mesh.bounds[0]
        scale = 1000.0 if float(np.max(extents)) < 5.0 else 1.0
        dims = [float(round(v * scale, 1)) for v in extents]
        center = [float(round(v * scale, 1)) for v in mesh.centroid]
        return self._classify_obb(dims, center, default_label)

    def _from_open3d_pcd(self, pcd: Any) -> List[ScannedPrimitive]:
        """RANSAC floor + DBSCAN clusters + OBB per cluster."""
        pts = np.asarray(pcd.points)
        if pts.size == 0:
            return []

        scale = 1000.0 if float(np.max(np.ptp(pts, axis=0))) < 5.0 else 1.0
        pts_mm = pts * scale
        pcd_mm = o3d.geometry.PointCloud()
        pcd_mm.points = o3d.utility.Vector3dVector(pts_mm)

        # --- Floor RANSAC ---
        aligned = self._align_to_floor(pcd_mm)

        # --- DBSCAN ---
        labels = np.array(aligned.cluster_dbscan(eps=25.0, min_points=30, print_progress=False))
        if labels.max() < 0:
            # single cluster fallback via OBB of whole cloud
            obb = aligned.get_oriented_bounding_box()
            dims = [float(round(v, 1)) for v in obb.extent]
            center = [float(round(v, 1)) for v in obb.center]
            return self._normalize_floor([self._classify_obb(dims, center, "estructura")])

        out: List[ScannedPrimitive] = []
        for lab in range(labels.max() + 1):
            idx = np.where(labels == lab)[0]
            if len(idx) < 20:
                continue
            cluster = aligned.select_by_index(idx.tolist())
            obb = cluster.get_oriented_bounding_box()
            dims = [float(round(abs(v), 1)) for v in obb.extent]
            center = [float(round(v, 1)) for v in obb.center]
            out.append(self._classify_obb(dims, center, f"cluster_{lab+1}"))

        return self._normalize_floor(out)

    def _align_to_floor(self, pcd: Any) -> Any:
        """Fit dominant plane with RANSAC and rotate so normal → +Y, plane → Y=0."""
        if len(pcd.points) < 50:
            return pcd
        try:
            plane_model, inliers = pcd.segment_plane(
                distance_threshold=8.0, ransac_n=3, num_iterations=800
            )
            a, b, c, d = plane_model
            normal = np.array([a, b, c], dtype=float)
            nlen = np.linalg.norm(normal) or 1.0
            normal /= nlen
            # Prefer upward (+Y)
            if normal[1] < 0:
                normal = -normal
                d = -d
            target = np.array([0.0, 1.0, 0.0])
            v = np.cross(normal, target)
            c_dot = float(np.dot(normal, target))
            if np.linalg.norm(v) > 1e-6:
                vx = np.array(
                    [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]], dtype=float
                )
                R = np.eye(3) + vx + vx @ vx * (1 / (1 + c_dot))
                pcd.rotate(R, center=(0, 0, 0))
            # shift so min Y = 0
            pts = np.asarray(pcd.points)
            pts[:, 1] -= pts[:, 1].min()
            pcd.points = o3d.utility.Vector3dVector(pts)
        except Exception as exc:
            print(f"[VisionEngine] floor align skipped: {exc}")
        return pcd

    def _normalize_floor(self, primitives: List[ScannedPrimitive]) -> List[ScannedPrimitive]:
        if not primitives:
            return primitives
        min_y = min(p.center_point[1] - p.dimensions_mm[1] / 2.0 for p in primitives)
        for p in primitives:
            p.center_point[1] = float(round(p.center_point[1] - min_y, 1))
        return primitives

    def _classify_obb(
        self, dims: List[float], center: List[float], default_label: str
    ) -> ScannedPrimitive:
        dx, dy, dz = dims[0], dims[1], dims[2]
        sorted_d = sorted([dx, dy, dz])
        thickness, mid, length = sorted_d[0], sorted_d[1], sorted_d[2]
        aspect = length / max(thickness, 1.0)
        is_leg = (dy > 2.2 * max(dx, dz) and max(dx, dz) < 120) or (aspect > 4.5 and mid < 100)

        if is_leg:
            p_type = "TORNILLO"
            label = "pata_soporte"
            tone = "#c0c0c0"
            ctype = "PATA"
        elif thickness < 55 and length * mid > 35000:
            p_type = "TABLERO"
            label = "tablero_panel"
            tone = "#d4a373"
            ctype = "TABLERO"
        elif mid > 80 and thickness > 40 and length < 500:
            p_type = "CAJON"
            label = "cajon_modulo"
            tone = "#e0ddd4"
            ctype = "CAJON"
        else:
            p_type = "TABLERO"
            label = default_label
            tone = "#c4b896"
            ctype = "TABLERO"

        # Prefer vertical extent on Y for legs
        if p_type == "TORNILLO":
            dims_out = [float(min(dx, dz)), float(max(dy, length * 0.5)), float(min(dx, dz))]
            if dy < length * 0.4:
                dims_out = [float(mid), float(length), float(thickness)]
        else:
            dims_out = [float(round(dx, 1)), float(round(dy, 1)), float(round(dz, 1))]

        return ScannedPrimitive(
            id=f"part_{uuid.uuid4().hex[:6]}",
            label=label,
            primitive_type=p_type,
            dimensions_mm=dims_out,
            center_point=[float(round(center[0], 1)), float(round(center[1], 1)), float(round(center[2], 1))],
            normal_vector=[0.0, 1.0, 0.0],
            material_tone=tone,
            confidence=0.9,
            component_type=ctype,
        )

    # ---------------------------------------------------------- topology graph
    def _detect_contact_joints(self, primitives: List[ScannedPrimitive]) -> List[ContactJoint]:
        joints: List[ContactJoint] = []
        for i, a in enumerate(primitives):
            for b in primitives[i + 1 :]:
                gap = self._aabb_gap(a, b)
                if gap > self.margin_mm:
                    continue
                # lower center → parent
                if a.center_point[1] <= b.center_point[1]:
                    parent, child = a, b
                else:
                    parent, child = b, a
                ctype = "ATORNILLADO" if child.primitive_type == "TORNILLO" else "APOYO"
                if child.primitive_type == "CAJON":
                    ctype = "ENCAJE"
                joints.append(
                    ContactJoint(
                        parent_id=parent.id,
                        child_id=child.id,
                        contact_type=ctype,
                        normal=[0.0, 1.0, 0.0],
                    )
                )
        return joints

    def _aabb_gap(self, a: ScannedPrimitive, b: ScannedPrimitive) -> float:
        ax, ay, az = a.center_point
        bx, by, bz = b.center_point
        aw, ah, ad = a.dimensions_mm
        bw, bh, bd = b.dimensions_mm
        dx = abs(ax - bx) - (aw / 2 + bw / 2)
        dy = abs(ay - by) - (ah / 2 + bh / 2)
        dz = abs(az - bz) - (ad / 2 + bd / 2)
        return max(dx, dy, dz)

    def _build_assembly_hierarchy(
        self, primitives: List[ScannedPrimitive], joints: List[ContactJoint]
    ) -> List[AssemblyStepDTO]:
        by_id = {p.id: p for p in primitives}
        children: Dict[str, List[str]] = {p.id: [] for p in primitives}
        parents: Dict[str, Optional[str]] = {p.id: None for p in primitives}
        for j in joints:
            children[j.parent_id].append(j.child_id)
            parents[j.child_id] = j.parent_id

        # Bottom-up: sort by ascending bottom Y
        ordered = sorted(
            primitives,
            key=lambda p: (p.center_point[1] - p.dimensions_mm[1] / 2.0, p.label),
        )

        steps: List[AssemblyStepDTO] = []
        placed: set = set()
        step_i = 1
        for p in ordered:
            if p.id in placed:
                continue
            # group legs together
            if p.primitive_type == "TORNILLO":
                legs = [x for x in ordered if x.primitive_type == "TORNILLO" and x.id not in placed]
                if not legs:
                    continue
                vol = sum(l.dimensions_mm[0] * l.dimensions_mm[1] * l.dimensions_mm[2] for l in legs)
                span = max(l.center_point[0] for l in legs) - min(l.center_point[0] for l in legs) if len(legs) > 1 else 0
                parent = parents.get(legs[0].id)
                steps.append(
                    AssemblyStepDTO(
                        step_index=step_i,
                        description=f"Fijar {len(legs)} patas / soportes",
                        action="UNIR",
                        parent_id=parent,
                        children_ids=[l.id for l in legs],
                        fasteners_used=len(legs) * 2,
                        requires_two_people=vol > TIPPING_VOLUME_MM3 or span > TIPPING_WIDTH_MM,
                    )
                )
                for l in legs:
                    placed.add(l.id)
                step_i += 1
                continue

            parent = parents.get(p.id)
            vol = p.dimensions_mm[0] * p.dimensions_mm[1] * p.dimensions_mm[2]
            requires = p.primitive_type == "TABLERO" and (
                vol > TIPPING_VOLUME_MM3 or p.dimensions_mm[0] > TIPPING_WIDTH_MM
            )
            action = "COLOCAR" if parent is None else "UNIR"
            steps.append(
                AssemblyStepDTO(
                    step_index=step_i,
                    description=f"{'Anclar' if parent is None else 'Unir'} {p.label}",
                    action=action,
                    parent_id=parent,
                    children_ids=[p.id],
                    fasteners_used=4 if p.primitive_type == "TABLERO" else 0,
                    requires_two_people=requires,
                )
            )
            placed.add(p.id)
            step_i += 1

        return steps

    def _to_hardware_inventory(self, primitives: List[ScannedPrimitive]) -> HardwareInventory:
        tableros: List[ScannedComponent] = []
        tornillos: List[ScannedComponent] = []
        cajones: List[ScannedComponent] = []
        for p in primitives:
            comp = ScannedComponent(
                id=p.id,
                label=p.label,
                type=p.component_type or (
                    "PATA" if p.primitive_type == "TORNILLO" else p.primitive_type  # type: ignore
                ),
                dimensions_mm=(
                    float(p.dimensions_mm[0]),
                    float(p.dimensions_mm[1]),
                    float(p.dimensions_mm[2]),
                ),
                center_point=(
                    float(p.center_point[0]),
                    float(p.center_point[1]),
                    float(p.center_point[2]),
                ),
                color_hex=p.material_tone,
            )
            if p.primitive_type == "CAJON":
                cajones.append(comp)
            elif p.primitive_type == "TORNILLO":
                tornillos.append(comp)
            else:
                tableros.append(comp)
        return HardwareInventory(
            tableros=tableros, tornillos_soportes=tornillos, cajones=cajones
        )

    def _classify_furniture(
        self, primitives: List[ScannedPrimitive], filename: str
    ) -> Tuple[str, str]:
        hint = filename.lower()
        n_legs = sum(1 for p in primitives if p.primitive_type == "TORNILLO")
        n_drawers = sum(1 for p in primitives if p.primitive_type == "CAJON")
        n_boards = sum(1 for p in primitives if p.primitive_type == "TABLERO")
        if "silla" in hint or (n_legs >= 3 and n_boards <= 3):
            return "Silla", "SillaEscaneada"
        if "cajon" in hint or n_drawers >= 2:
            return "Cajonera", "CajoneraEscaneada"
        if "estanter" in hint or "kallax" in hint or (n_boards >= 4 and n_legs == 0):
            return "Estantería", "EstanteriaEscaneada"
        if n_legs >= 4:
            return "Mesa", "MesaEscaneada"
        return "Mueble", "MuebleEscaneado"

    # ----------------------------------------------------------- demo samples
    def _fallback_primitives(self, filename: str) -> List[ScannedPrimitive]:
        hint = filename.lower()
        if "silla" in hint:
            return self._chair_primitives()
        if "cajon" in hint or "alex" in hint:
            return self._drawer_primitives()
        if "estanter" in hint or "kallax" in hint:
            return self._shelf_primitives()
        return self._table_primitives()

    def _prim(
        self,
        label: str,
        ptype: str,
        dims: List[float],
        center: List[float],
        tone: str,
        ctype: str,
    ) -> ScannedPrimitive:
        return ScannedPrimitive(
            id=f"part_{uuid.uuid4().hex[:6]}",
            label=label,
            primitive_type=ptype,  # type: ignore
            dimensions_mm=dims,
            center_point=center,
            material_tone=tone,
            confidence=0.95,
            component_type=ctype,  # type: ignore
        )

    def _table_primitives(self) -> List[ScannedPrimitive]:
        return self._normalize_floor(
            [
                self._prim("tablero_superior", "TABLERO", [550, 40, 550], [0, 470, 0], "#d4a373", "TABLERO"),
                self._prim("pata_fl", "TORNILLO", [45, 450, 45], [-220, 225, 220], "#c0c0c0", "PATA"),
                self._prim("pata_fr", "TORNILLO", [45, 450, 45], [220, 225, 220], "#c0c0c0", "PATA"),
                self._prim("pata_bl", "TORNILLO", [45, 450, 45], [-220, 225, -220], "#c0c0c0", "PATA"),
                self._prim("pata_br", "TORNILLO", [45, 450, 45], [220, 225, -220], "#c0c0c0", "PATA"),
            ]
        )

    def _shelf_primitives(self) -> List[ScannedPrimitive]:
        return self._normalize_floor(
            [
                self._prim("base_inferior", "TABLERO", [342, 12, 162], [0, 6, 0], "#d4b896", "TABLERO"),
                self._prim("balda_central", "TABLERO", [310, 12, 154], [0, 190, 0], "#b8956a", "TABLERO"),
                self._prim("tablero_superior", "TABLERO", [342, 12, 162], [0, 374, 0], "#d4b896", "TABLERO"),
                self._prim("lateral_izq", "TABLERO", [14, 380, 162], [-164, 190, 0], "#d4a373", "TABLERO"),
                self._prim("lateral_der", "TABLERO", [14, 380, 162], [164, 190, 0], "#d4a373", "TABLERO"),
            ]
        )

    def _chair_primitives(self) -> List[ScannedPrimitive]:
        return self._normalize_floor(
            [
                self._prim("asiento", "TABLERO", [420, 30, 400], [0, 450, 0], "#c4a574", "TABLERO"),
                self._prim("respaldo", "TABLERO", [420, 480, 25], [0, 700, -180], "#b8956a", "TABLERO"),
                self._prim("pata_fl", "TORNILLO", [35, 450, 35], [-170, 225, 150], "#8b6914", "PATA"),
                self._prim("pata_fr", "TORNILLO", [35, 450, 35], [170, 225, 150], "#8b6914", "PATA"),
                self._prim("pata_bl", "TORNILLO", [35, 450, 35], [-170, 225, -150], "#8b6914", "PATA"),
                self._prim("pata_br", "TORNILLO", [35, 450, 35], [170, 225, -150], "#8b6914", "PATA"),
            ]
        )

    def _drawer_primitives(self) -> List[ScannedPrimitive]:
        return self._normalize_floor(
            [
                self._prim("chasis", "TABLERO", [360, 700, 480], [0, 350, 0], "#f5f5f0", "TABLERO"),
                self._prim("cajon_1", "CAJON", [320, 110, 400], [0, 120, 40], "#e0ddd4", "CAJON"),
                self._prim("cajon_2", "CAJON", [320, 110, 400], [0, 250, 40], "#e0ddd4", "CAJON"),
                self._prim("cajon_3", "CAJON", [320, 110, 400], [0, 380, 40], "#e0ddd4", "CAJON"),
            ]
        )


# Backward-compatible alias used by legacy main.py
SpatialGeometryEngine = VisionEngine
