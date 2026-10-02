// ============================================================================
// IKEALang v1.1 - 3D Furniture Procedural Geometry Builders for Three.js
// ============================================================================

import * as THREE from 'three';

export interface FurnitureAssemblyMesh {
  group: THREE.Group;
  updateStep: (stepNumber: number, totalSteps: number, explodeAmount: number) => void;
  dispose: () => void;
}

export function buildFurnitureModel(
  modelId: 'lack' | 'kallax' | 'alex' | 'pax' | 'chair' | 'generic',
  themeStyle: 'blueprint' | 'wood' | 'manual'
): FurnitureAssemblyMesh {
  const group = new THREE.Group();

  // Materials based on theme
  let woodMaterial: THREE.Material;
  let screwMaterial: THREE.Material;
  let wireframe = false;

  if (themeStyle === 'blueprint') {
    woodMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      wireframe: true,
    });
    screwMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      wireframe: true,
    });
  } else if (themeStyle === 'manual') {
    woodMaterial = new THREE.MeshLambertMaterial({
      color: 0xf5f3ee,
    });
    screwMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
    });
  } else {
    // Realistic wood
    woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // Birch wood
      roughness: 0.6,
      metalness: 0.1,
    });
    screwMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver steel
      roughness: 0.3,
      metalness: 0.8,
    });
  }

  // Build specific models
  if (modelId === 'lack') {
    return buildLackTable(group, woodMaterial, screwMaterial);
  } else if (modelId === 'kallax') {
    return buildKallaxShelf(group, woodMaterial, screwMaterial);
  } else if (modelId === 'alex') {
    return buildAlexDrawers(group, woodMaterial, screwMaterial);
  } else {
    return buildLackTable(group, woodMaterial, screwMaterial);
  }
}

// 1. LACK TABLE PROCEDURAL MODEL
function buildLackTable(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  // Top tabletop panel: 55 x 55 x 5 cm -> scale 5.5 x 0.5 x 5.5
  const topGeo = new THREE.BoxGeometry(5.5, 0.5, 5.5);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.set(0, 4.5, 0);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 4 Legs: 0.5 x 4.5 x 0.5
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
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
    legMeshes.push(leg);
  });

  // 4 Screws
  const screwGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12);
  const screwMeshes: THREE.Mesh[] = [];
  legPositions.forEach((pos) => {
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.position.set(pos[0], 4.4, pos[2]);
    group.add(screw);
    screwMeshes.push(screw);
  });

  // Dynamic step progression logic
  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    // Step 0: unbox / flat-pack layout
    if (stepNumber <= 0) {
      topMesh.visible = true;
      topMesh.position.set(0, 0.25, 0); // Flat on floor
      legMeshes.forEach((leg, i) => {
        leg.visible = false;
        leg.position.set(-4 + i * 2.5, 0.25, 3.5);
        leg.rotation.set(Math.PI / 2, 0, 0);
      });
      screwMeshes.forEach(s => (s.visible = false));
      return;
    }

    // Step 1: tabletop ready
    if (stepNumber === 1) {
      topMesh.visible = true;
      topMesh.position.set(0, 4.5 + explodeAmount * 2, 0);
      legMeshes.forEach(l => (l.visible = false));
      screwMeshes.forEach(s => (s.visible = false));
      return;
    }

    // Step 2: attaching legs and screws
    if (stepNumber === 2) {
      topMesh.visible = true;
      topMesh.position.set(0, 4.5 + explodeAmount * 2, 0);
      legMeshes.forEach((leg, i) => {
        leg.visible = true;
        const base = legPositions[i];
        const ex = explodeAmount * 0.8;
        leg.position.set(
          base[0] + (base[0] > 0 ? ex : -ex),
          base[1],
          base[2] + (base[2] > 0 ? ex : -ex)
        );
        leg.rotation.set(0, 0, 0);
      });
      screwMeshes.forEach(s => (s.visible = true));
      return;
    }

    // Step 3 or finished: full assembly
    topMesh.visible = true;
    topMesh.position.set(0, 4.5 + explodeAmount * 2, 0);
    legMeshes.forEach((leg, i) => {
      leg.visible = true;
      const base = legPositions[i];
      const ex = explodeAmount * 0.8;
      leg.position.set(
        base[0] + (base[0] > 0 ? ex : -ex),
        base[1],
        base[2] + (base[2] > 0 ? ex : -ex)
      );
      leg.rotation.set(0, 0, 0);
    });
    screwMeshes.forEach(s => (s.visible = true));
  };

  return {
    group,
    updateStep,
    dispose: () => {
      topGeo.dispose();
      legGeo.dispose();
      screwGeo.dispose();
    },
  };
}

// 2. KALLAX 2x2 PROCEDURAL MODEL
function buildKallaxShelf(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  // Outer frame: Top, Bottom, Left, Right
  const outerThick = 0.4;
  const size = 6.0;
  const depth = 3.5;

  const topBottomGeo = new THREE.BoxGeometry(size, outerThick, depth);
  const topPanel = new THREE.Mesh(topBottomGeo, woodMat);
  topPanel.position.set(0, size / 2, 0);
  group.add(topPanel);

  const bottomPanel = new THREE.Mesh(topBottomGeo, woodMat);
  bottomPanel.position.set(0, -size / 2, 0);
  group.add(bottomPanel);

  const sidesGeo = new THREE.BoxGeometry(outerThick, size - outerThick * 2, depth);
  const leftPanel = new THREE.Mesh(sidesGeo, woodMat);
  leftPanel.position.set(-size / 2 + outerThick / 2, 0, 0);
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(sidesGeo, woodMat);
  rightPanel.position.set(size / 2 - outerThick / 2, 0, 0);
  group.add(rightPanel);

  // Internal Cross Dividers (Inner horizontal shelf + Inner vertical divider)
  const innerThick = 0.25;
  const innerHGeo = new THREE.BoxGeometry(size - outerThick * 2, innerThick, depth);
  const innerShelf = new THREE.Mesh(innerHGeo, woodMat);
  innerShelf.position.set(0, 0, 0);
  group.add(innerShelf);

  const innerVGeo = new THREE.BoxGeometry(innerThick, (size - outerThick * 2 - innerThick) / 2, depth);
  const innerTopV = new THREE.Mesh(innerVGeo, woodMat);
  innerTopV.position.set(0, 1.4, 0);
  group.add(innerTopV);

  const innerBottomV = new THREE.Mesh(innerVGeo, woodMat);
  innerBottomV.position.set(0, -1.4, 0);
  group.add(innerBottomV);

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    const ex = explodeAmount * 1.5;

    if (stepNumber <= 0) {
      topPanel.visible = false;
      bottomPanel.visible = true;
      leftPanel.visible = false;
      rightPanel.visible = false;
      innerShelf.visible = false;
      innerTopV.visible = false;
      innerBottomV.visible = false;
      return;
    }

    if (stepNumber === 1) {
      // Internal cruceta
      topPanel.visible = false;
      bottomPanel.visible = true;
      leftPanel.visible = false;
      rightPanel.visible = false;
      innerShelf.visible = true;
      innerTopV.visible = true;
      innerBottomV.visible = true;
      return;
    }

    // Step 2 & 3: full frame
    topPanel.visible = true;
    bottomPanel.visible = true;
    leftPanel.visible = true;
    rightPanel.visible = true;
    innerShelf.visible = true;
    innerTopV.visible = true;
    innerBottomV.visible = true;

    // Apply exploded offsets
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

// 3. ALEX DRAWERS PROCEDURAL MODEL
function buildAlexDrawers(
  group: THREE.Group,
  woodMat: THREE.Material,
  screwMat: THREE.Material
): FurnitureAssemblyMesh {
  // Cabinet casing
  const caseGeo = new THREE.BoxGeometry(4.0, 7.0, 5.0);
  const casing = new THREE.Mesh(caseGeo, woodMat);
  casing.position.set(0, 0, 0);
  group.add(casing);

  // 5 Drawer Fronts
  const drawerGeo = new THREE.BoxGeometry(3.6, 1.1, 0.4);
  const drawerMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const drawer = new THREE.Mesh(drawerGeo, screwMat);
    drawer.position.set(0, -2.6 + i * 1.3, 2.5);
    group.add(drawer);
    drawerMeshes.push(drawer);
  }

  const updateStep = (stepNumber: number, totalSteps: number, explodeAmount: number) => {
    if (stepNumber <= 1) {
      drawerMeshes.forEach(d => (d.visible = false));
    } else {
      drawerMeshes.forEach((d, i) => {
        d.visible = true;
        d.position.z = 2.5 + explodeAmount * (0.8 + i * 0.3);
      });
    }
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
