// ============================================================================
// IKEALang v1.2 - 3D Universal Furniture Procedural Geometry Builders
// Supports chairs, tables, wardrobes, drawers, shelves, beds, modular furniture
// ============================================================================

import * as THREE from 'three';
import { FurnitureModelId } from '../core/types.ts';

export interface FurnitureAssemblyMesh {
  group: THREE.Group;
  updateStep: (stepNumber: number, totalSteps: number, explodeAmount: number) => void;
  dispose: () => void;
}

export function buildFurnitureModel(
  modelId: FurnitureModelId,
  themeStyle: 'blueprint' | 'wood' | 'manual'
): FurnitureAssemblyMesh {
  const group = new THREE.Group();

  // Materials based on theme
  let woodMaterial: THREE.Material;
  let screwMaterial: THREE.Material;
  let fabricMaterial: THREE.Material;

  if (themeStyle === 'blueprint') {
    woodMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      wireframe: true,
    });
    screwMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      wireframe: true,
    });
    fabricMaterial = new THREE.MeshBasicMaterial({
      color: 0x81d4fa,
      wireframe: true,
    });
  } else if (themeStyle === 'manual') {
    woodMaterial = new THREE.MeshLambertMaterial({
      color: 0xf5f3ee,
    });
    screwMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
    });
    fabricMaterial = new THREE.MeshLambertMaterial({
      color: 0xe0ded8,
    });
  } else {
    // Realistic birch wood & steel
    woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.6,
      metalness: 0.1,
    });
    screwMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.3,
      metalness: 0.8,
    });
    fabricMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6e2dd,
      roughness: 0.9,
      metalness: 0.05,
    });
  }

  // Switch to specific furniture builders
  switch (modelId) {
    case 'chair':
      return buildChair(group, woodMaterial, screwMaterial);
    case 'bed':
      return buildBed(group, woodMaterial, screwMaterial, fabricMaterial);
    case 'wardrobe':
    case 'pax':
      return buildWardrobe(group, woodMaterial, screwMaterial);
    case 'alex':
      return buildAlexDrawers(group, woodMaterial, screwMaterial);
    case 'kallax':
      return buildKallaxShelf(group, woodMaterial, screwMaterial);
    case 'lack':
      return buildLackTable(group, woodMaterial, screwMaterial);
    case 'generic':
    default:
      return buildGenericFurniture(group, woodMaterial, screwMaterial);
  }
}

// ----------------------------------------------------------------------------
// 1. SILLA (CHAIR) - Asiento, 4 patas, respaldo y travesaños firmes
// ----------------------------------------------------------------------------
function buildChair(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  // Asiento: 4.0 x 0.4 x 4.0 a altura y = 3.0
  const seatGeo = new THREE.BoxGeometry(4.0, 0.4, 4.0);
  const seat = new THREE.Mesh(seatGeo, woodMat);
  seat.position.set(0, 3.0, 0);
  group.add(seat);

  // 2 Patas delanteras: 0.4 x 3.0 x 0.4
  const frontLegGeo = new THREE.BoxGeometry(0.4, 3.0, 0.4);
  const legFL = new THREE.Mesh(frontLegGeo, woodMat);
  legFL.position.set(-1.6, 1.5, 1.6);
  const legFR = new THREE.Mesh(frontLegGeo, woodMat);
  legFR.position.set(1.6, 1.5, 1.6);
  group.add(legFL);
  group.add(legFR);

  // 2 Patas traseras extendidas (montantes del respaldo): 0.4 x 7.0 x 0.4
  const backLegGeo = new THREE.BoxGeometry(0.4, 7.0, 0.4);
  const legBL = new THREE.Mesh(backLegGeo, woodMat);
  legBL.position.set(-1.6, 3.5, -1.6);
  const legBR = new THREE.Mesh(backLegGeo, woodMat);
  legBR.position.set(1.6, 3.5, -1.6);
  group.add(legBL);
  group.add(legBR);

  // 3 Travesaños de respaldo horizontales
  const slatGeo = new THREE.BoxGeometry(3.0, 0.4, 0.2);
  const slat1 = new THREE.Mesh(slatGeo, woodMat);
  slat1.position.set(0, 4.8, -1.6);
  const slat2 = new THREE.Mesh(slatGeo, woodMat);
  slat2.position.set(0, 5.8, -1.6);
  const slat3 = new THREE.Mesh(slatGeo, woodMat);
  slat3.position.set(0, 6.7, -1.6);
  group.add(slat1);
  group.add(slat2);
  group.add(slat3);

  // Travesaños inferiores de refuerzo entre patas
  const braceSideGeo = new THREE.BoxGeometry(0.2, 0.2, 3.0);
  const braceL = new THREE.Mesh(braceSideGeo, woodMat);
  braceL.position.set(-1.6, 1.0, 0);
  const braceR = new THREE.Mesh(braceSideGeo, woodMat);
  braceR.position.set(1.6, 1.0, 0);
  group.add(braceL);
  group.add(braceR);

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.5;

    // Paso 1: Patas y estructura base
    const step1Visible = stepNumber >= 1;
    legFL.visible = step1Visible;
    legFR.visible = step1Visible;
    legBL.visible = step1Visible;
    legBR.visible = step1Visible;
    braceL.visible = step1Visible;
    braceR.visible = step1Visible;

    // Paso 2: Asiento
    seat.visible = stepNumber >= 2;

    // Paso 3: Respaldo y acabado
    slat1.visible = stepNumber >= 3;
    slat2.visible = stepNumber >= 3;
    slat3.visible = stepNumber >= 3;

    // Posicionamiento con explosión
    seat.position.set(0, 3.0 + ex * 1.5, 0);
    legFL.position.set(-1.6 - ex, 1.5, 1.6 + ex);
    legFR.position.set(1.6 + ex, 1.5, 1.6 + ex);
    legBL.position.set(-1.6 - ex, 3.5, -1.6 - ex);
    legBR.position.set(1.6 + ex, 3.5, -1.6 - ex);
    slat1.position.set(0, 4.8 + ex * 0.5, -1.6 - ex * 1.5);
    slat2.position.set(0, 5.8 + ex * 0.8, -1.6 - ex * 1.5);
    slat3.position.set(0, 6.7 + ex * 1.2, -1.6 - ex * 1.5);
  };

  return {
    group,
    updateStep,
    dispose: () => {
      seatGeo.dispose();
      frontLegGeo.dispose();
      backLegGeo.dispose();
      slatGeo.dispose();
      braceSideGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 2. ARMARIO / ROPERO (WARDROBE / PAX) - Laterales, baldas, barra y puertas
// ----------------------------------------------------------------------------
function buildWardrobe(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  // Dimensiones: 5.4 ancho, 9.0 alto, 3.2 profundo
  const sideGeo = new THREE.BoxGeometry(0.4, 9.0, 3.2);
  const leftSide = new THREE.Mesh(sideGeo, woodMat);
  leftSide.position.set(-2.5, 4.5, 0);
  const rightSide = new THREE.Mesh(sideGeo, woodMat);
  rightSide.position.set(2.5, 4.5, 0);
  group.add(leftSide);
  group.add(rightSide);

  const topBottomGeo = new THREE.BoxGeometry(5.4, 0.4, 3.2);
  const bottomPanel = new THREE.Mesh(topBottomGeo, woodMat);
  bottomPanel.position.set(0, 0.2, 0);
  const topPanel = new THREE.Mesh(topBottomGeo, woodMat);
  topPanel.position.set(0, 8.8, 0);
  group.add(bottomPanel);
  group.add(topPanel);

  // Panel trasero
  const backGeo = new THREE.BoxGeometry(5.0, 8.6, 0.1);
  const backPanel = new THREE.Mesh(backGeo, woodMat);
  backPanel.position.set(0, 4.5, -1.55);
  group.add(backPanel);

  // 2 Baldas interiores
  const shelfGeo = new THREE.BoxGeometry(4.6, 0.3, 3.0);
  const shelf1 = new THREE.Mesh(shelfGeo, woodMat);
  shelf1.position.set(0, 2.5, 0);
  const shelf2 = new THREE.Mesh(shelfGeo, woodMat);
  shelf2.position.set(0, 7.0, 0);
  group.add(shelf1);
  group.add(shelf2);

  // Barra de colgar perchas metálica
  const rodGeo = new THREE.CylinderGeometry(0.1, 0.1, 4.6, 16);
  const rod = new THREE.Mesh(rodGeo, screwMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 6.4, 0);
  group.add(rod);

  // 2 Puertas frontales
  const doorGeo = new THREE.BoxGeometry(2.25, 8.3, 0.2);
  const doorLeft = new THREE.Mesh(doorGeo, woodMat);
  doorLeft.position.set(-1.15, 4.5, 1.6);
  const doorRight = new THREE.Mesh(doorGeo, woodMat);
  doorRight.position.set(1.15, 4.5, 1.6);
  group.add(doorLeft);
  group.add(doorRight);

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.5;

    // Paso 1: Bastidor exterior (laterales, suelo, techo, fondo)
    leftSide.visible = stepNumber >= 1;
    rightSide.visible = stepNumber >= 1;
    bottomPanel.visible = stepNumber >= 1;
    topPanel.visible = stepNumber >= 1;
    backPanel.visible = stepNumber >= 1;

    // Paso 2: Baldas interiores y barra
    shelf1.visible = stepNumber >= 2;
    shelf2.visible = stepNumber >= 2;
    rod.visible = stepNumber >= 2;

    // Paso 3: Puertas frontales y bisagras
    doorLeft.visible = stepNumber >= 3;
    doorRight.visible = stepNumber >= 3;

    // Despiece
    leftSide.position.set(-2.5 - ex, 4.5, 0);
    rightSide.position.set(2.5 + ex, 4.5, 0);
    topPanel.position.set(0, 8.8 + ex, 0);
    bottomPanel.position.set(0, 0.2 - ex * 0.5, 0);
    backPanel.position.set(0, 4.5, -1.55 - ex);
    shelf1.position.set(0, 2.5, 0);
    shelf2.position.set(0, 7.0, 0);
    doorLeft.position.set(-1.15 - ex * 0.5, 4.5, 1.6 + ex * 1.5);
    doorRight.position.set(1.15 + ex * 0.5, 4.5, 1.6 + ex * 1.5);
  };

  return {
    group,
    updateStep,
    dispose: () => {
      sideGeo.dispose();
      topBottomGeo.dispose();
      backGeo.dispose();
      shelfGeo.dispose();
      rodGeo.dispose();
      doorGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 3. CAMA (BED) - Cabecero, piecero, largueros, somier de láminas y colchón
// ----------------------------------------------------------------------------
function buildBed(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material,
  fabricMat: THREE.Material
): FurnitureAssemblyMesh {
  // Cabecero (alto): 7.2 x 4.0 x 0.4 en Z = -4.0
  const headboardGeo = new THREE.BoxGeometry(7.2, 4.0, 0.4);
  const headboard = new THREE.Mesh(headboardGeo, woodMat);
  headboard.position.set(0, 2.0, -4.0);
  group.add(headboard);

  // Piecero (bajo): 7.2 x 1.6 x 0.4 en Z = 4.0
  const footboardGeo = new THREE.BoxGeometry(7.2, 1.6, 0.4);
  const footboard = new THREE.Mesh(footboardGeo, woodMat);
  footboard.position.set(0, 0.8, 4.0);
  group.add(footboard);

  // Largueros laterales: 0.4 x 1.4 x 7.6
  const sideRailGeo = new THREE.BoxGeometry(0.4, 1.4, 7.6);
  const railLeft = new THREE.Mesh(sideRailGeo, woodMat);
  railLeft.position.set(-3.4, 0.8, 0);
  const railRight = new THREE.Mesh(sideRailGeo, woodMat);
  railRight.position.set(3.4, 0.8, 0);
  group.add(railLeft);
  group.add(railRight);

  // Viga central metálica de soporte
  const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 7.6);
  const centerBeam = new THREE.Mesh(beamGeo, screwMat);
  centerBeam.position.set(0, 0.7, 0);
  group.add(centerBeam);

  // Somier con láminas de madera (slats)
  const slatGeo = new THREE.BoxGeometry(6.4, 0.15, 0.4);
  const slatMeshes: THREE.Mesh[] = [];
  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.Mesh(slatGeo, woodMat);
    slat.position.set(0, 1.0, i * 0.9);
    group.add(slat);
    slatMeshes.push(slat);
  }

  // Colchón matrimonial superior
  const mattressGeo = new THREE.BoxGeometry(6.4, 1.2, 7.4);
  const mattress = new THREE.Mesh(mattressGeo, fabricMat);
  mattress.position.set(0, 1.8, 0);
  group.add(mattress);

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.5;

    // Paso 1: Marco de la cama (cabecero, piecero, largueros)
    headboard.visible = stepNumber >= 1;
    footboard.visible = stepNumber >= 1;
    railLeft.visible = stepNumber >= 1;
    railRight.visible = stepNumber >= 1;

    // Paso 2: Viga central y somier de láminas
    centerBeam.visible = stepNumber >= 2;
    slatMeshes.forEach(s => (s.visible = stepNumber >= 2));

    // Paso 3: Colchón y estabilidad final
    mattress.visible = stepNumber >= 3;

    // Despiece
    headboard.position.set(0, 2.0, -4.0 - ex * 1.5);
    footboard.position.set(0, 0.8, 4.0 + ex * 1.5);
    railLeft.position.set(-3.4 - ex, 0.8, 0);
    railRight.position.set(3.4 + ex, 0.8, 0);
    centerBeam.position.set(0, 0.7 - ex * 0.5, 0);
    slatMeshes.forEach((s, idx) => {
      s.position.y = 1.0 + ex * 0.8;
    });
    mattress.position.set(0, 1.8 + ex * 2.0, 0);
  };

  return {
    group,
    updateStep,
    dispose: () => {
      headboardGeo.dispose();
      footboardGeo.dispose();
      sideRailGeo.dispose();
      beamGeo.dispose();
      slatGeo.dispose();
      mattressGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 4. MESA (LACK) - Tablero y 4 patas cilíndricas/cuadradas
// ----------------------------------------------------------------------------
function buildLackTable(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  const topGeo = new THREE.BoxGeometry(5.5, 0.5, 5.5);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.set(0, 4.5, 0);
  group.add(topMesh);

  const legGeo = new THREE.BoxGeometry(0.5, 4.5, 0.5);
  const legPositions = [
    [-2.3, 2.25, -2.3],
    [2.3, 2.25, -2.3],
    [-2.3, 2.25, 2.3],
    [2.3, 2.25, 2.3],
  ];

  const legMeshes: THREE.Mesh[] = [];
  legPositions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
    legMeshes.push(leg);
  });

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.5;

    topMesh.visible = stepNumber >= 1;
    legMeshes.forEach(l => (l.visible = stepNumber >= 2));

    topMesh.position.set(0, 4.5 + ex * 1.5, 0);
    legMeshes.forEach((l, idx) => {
      const orig = legPositions[idx];
      const signX = Math.sign(orig[0]);
      const signZ = Math.sign(orig[2]);
      l.position.set(orig[0] + signX * ex, orig[1], orig[2] + signZ * ex);
    });
  };

  return {
    group,
    updateStep,
    dispose: () => {
      topGeo.dispose();
      legGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 5. ESTANTERÍA MODULAR (KALLAX) - Cubos 2x2 con divisiones cruzadas
// ----------------------------------------------------------------------------
function buildKallaxShelf(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  const size = 6.0;
  const depth = 3.0;
  const outerThick = 0.4;
  const innerThick = 0.25;

  const topBottomGeo = new THREE.BoxGeometry(size, outerThick, depth);
  const sidesGeo = new THREE.BoxGeometry(outerThick, size - outerThick * 2, depth);
  const innerHGeo = new THREE.BoxGeometry(size - outerThick * 2, innerThick, depth);
  const innerVGeo = new THREE.BoxGeometry(innerThick, (size - outerThick * 2 - innerThick) / 2, depth);

  const topPanel = new THREE.Mesh(topBottomGeo, woodMat);
  topPanel.position.set(0, size / 2, 0);
  const bottomPanel = new THREE.Mesh(topBottomGeo, woodMat);
  bottomPanel.position.set(0, -size / 2, 0);

  const leftPanel = new THREE.Mesh(sidesGeo, woodMat);
  leftPanel.position.set(-size / 2 + outerThick / 2, 0, 0);
  const rightPanel = new THREE.Mesh(sidesGeo, woodMat);
  rightPanel.position.set(size / 2 - outerThick / 2, 0, 0);

  const innerShelf = new THREE.Mesh(innerHGeo, woodMat);
  innerShelf.position.set(0, 0, 0);

  const innerTopV = new THREE.Mesh(innerVGeo, woodMat);
  innerTopV.position.set(0, size / 4 - outerThick / 4, 0);
  const innerBottomV = new THREE.Mesh(innerVGeo, woodMat);
  innerBottomV.position.set(0, -size / 4 + outerThick / 4, 0);

  group.add(topPanel);
  group.add(bottomPanel);
  group.add(leftPanel);
  group.add(rightPanel);
  group.add(innerShelf);
  group.add(innerTopV);
  group.add(innerBottomV);
  group.position.y = 3.5;

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.5;

    topPanel.visible = stepNumber >= 2;
    bottomPanel.visible = stepNumber >= 2;
    leftPanel.visible = stepNumber >= 2;
    rightPanel.visible = stepNumber >= 2;

    innerShelf.visible = stepNumber >= 1;
    innerTopV.visible = stepNumber >= 1;
    innerBottomV.visible = stepNumber >= 1;

    topPanel.position.set(0, size / 2 + ex, 0);
    bottomPanel.position.set(0, -size / 2 - ex, 0);
    leftPanel.position.set(-size / 2 + outerThick / 2 - ex, 0, 0);
    rightPanel.position.set(size / 2 - outerThick / 2 + ex, 0, 0);
  };

  return {
    group,
    updateStep,
    dispose: () => {
      topBottomGeo.dispose();
      sidesGeo.dispose();
      innerHGeo.dispose();
      innerVGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 6. CAJONERA (ALEX) - Chasis con 5 cajones extraíbles
// ----------------------------------------------------------------------------
function buildAlexDrawers(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  const caseGeo = new THREE.BoxGeometry(4.0, 7.0, 5.0);
  const casing = new THREE.Mesh(caseGeo, woodMat);
  casing.position.set(0, 3.5, 0);
  group.add(casing);

  const drawerGeo = new THREE.BoxGeometry(3.6, 1.1, 0.4);
  const drawerMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const drawer = new THREE.Mesh(drawerGeo, screwMat);
    drawer.position.set(0, 0.9 + i * 1.3, 2.5);
    group.add(drawer);
    drawerMeshes.push(drawer);
  }

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    casing.visible = stepNumber >= 1;
    drawerMeshes.forEach((d, i) => {
      d.visible = stepNumber >= 2;
      d.position.z = 2.5 + explodeAmount * (0.8 + i * 0.4);
    });
  };

  return {
    group,
    updateStep,
    dispose: () => {
      caseGeo.dispose();
      drawerGeo.dispose();
    },
  };
}

// ----------------------------------------------------------------------------
// 7. MUEBLE MODULAR GENÉRICO
// ----------------------------------------------------------------------------
function buildGenericFurniture(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  const baseGeo = new THREE.BoxGeometry(5.0, 0.5, 3.5);
  const baseMesh = new THREE.Mesh(baseGeo, woodMat);
  baseMesh.position.set(0, 0.5, 0);
  group.add(baseMesh);

  const bodyGeo = new THREE.BoxGeometry(4.6, 4.0, 3.2);
  const bodyMesh = new THREE.Mesh(bodyGeo, woodMat);
  bodyMesh.position.set(0, 2.8, 0);
  group.add(bodyMesh);

  const topGeo = new THREE.BoxGeometry(5.2, 0.4, 3.7);
  const topMesh = new THREE.Mesh(topGeo, screwMat);
  topMesh.position.set(0, 5.0, 0);
  group.add(topMesh);

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 2.0;
    baseMesh.visible = stepNumber >= 1;
    bodyMesh.visible = stepNumber >= 2;
    topMesh.visible = stepNumber >= 3;

    baseMesh.position.y = 0.5 - ex * 0.5;
    topMesh.position.y = 5.0 + ex;
  };

  return {
    group,
    updateStep,
    dispose: () => {
      baseGeo.dispose();
      bodyGeo.dispose();
      topGeo.dispose();
    },
  };
}
