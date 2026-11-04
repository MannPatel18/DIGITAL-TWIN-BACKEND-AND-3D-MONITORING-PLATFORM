import * as THREE from 'three';
import { ComponentId, BridgeComponent, InspectionRecord } from '../../types';

export interface ViewMode {
  renderMode: 'REALISTIC' | 'HEALTH_HEATMAP' | 'WIREFRAME';
  showSensors: boolean;
  showDefects: boolean;
  wireframe: boolean;
}

export function getHealthColor(score: number): number {
  if (score >= 90) return 0x43B58A; // Healthy (#43B58A)
  if (score >= 75) return 0xE0B653; // Advisory / Warning (#E0B653)
  if (score >= 55) return 0xD69A55; // Caution / Copper (#D69A55)
  return 0xDF6964; // Critical (#DF6964)
}

export function createBridgeMeshGroup(
  components: BridgeComponent[],
  mode: ViewMode,
  hoveredId: ComponentId | null,
  selectedId: ComponentId | null
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'BridgeRoot';

  const compMap = new Map<ComponentId, BridgeComponent>();
  components.forEach(c => compMap.set(c.id, c));

  const isWire = mode.renderMode === 'WIREFRAME';

  // Helper for material selection with realistic, separated structural engineering materials
  const getStructuralMaterial = (
    id: ComponentId,
    realisticHex: number,
    roughness = 0.55,
    metalness = 0.2,
    applyHeatmap = true
  ) => {
    const comp = compMap.get(id);
    const isSelected = selectedId === id;
    const isHovered = hoveredId === id;

    let color = realisticHex;
    if (mode.renderMode === 'HEALTH_HEATMAP' && applyHeatmap && comp) {
      color = getHealthColor(comp.healthScore);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness,
      metalness: metalness,
      wireframe: isWire,
      emissive: isSelected ? 0x28A6A0 : isHovered ? 0x4D91D2 : 0x000000,
      emissiveIntensity: isSelected ? 0.38 : isHovered ? 0.22 : 0.0,
    });
    return mat;
  };

  // 1. Natural Deep River Water Plane
  const waterGeo = new THREE.PlaneGeometry(130, 65, 32, 32);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0E1D2E,
    roughness: 0.12,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -6.5;
  root.add(water);

  // 2. Main Deck Span (Superstructure)
  const deckGroup = new THREE.Group();
  deckGroup.name = 'DECK_MIDSPAN';
  (deckGroup as any).componentId = 'DECK_MIDSPAN';

  const deckLength = 80;
  const deckWidth = 8;
  const deckThickness = 0.9;

  // Primary Deck Box Girder (Realistic concrete / structural steel box)
  const deckGeo = new THREE.BoxGeometry(deckLength, deckThickness, deckWidth);
  const deckMesh = new THREE.Mesh(
    deckGeo,
    getStructuralMaterial('DECK_MIDSPAN', 0x526375, 0.45, 0.35, true)
  );
  deckMesh.position.y = 3.2;
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  deckGroup.add(deckMesh);

  // Roadway Surface Slab (Dark natural asphalt - retains roadway texture in all modes)
  const roadGeo = new THREE.BoxGeometry(deckLength, 0.08, deckWidth - 0.5);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1B2633,
    roughness: 0.85,
    metalness: 0.05,
    wireframe: isWire,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, 3.2 + deckThickness / 2 + 0.04, 0);
  road.receiveShadow = true;
  deckGroup.add(road);

  // Road Markings (Crisp dashed highway center lane stripe)
  const roadStripeGeo = new THREE.BoxGeometry(deckLength, 0.02, 0.16);
  const roadStripeMat = new THREE.MeshBasicMaterial({ color: 0xF1F5F8 });
  const stripe = new THREE.Mesh(roadStripeGeo, roadStripeMat);
  stripe.position.set(0, 3.2 + deckThickness / 2 + 0.09, 0);
  deckGroup.add(stripe);

  // Galvanized Steel Safety Guardrails
  [-deckWidth / 2 + 0.25, deckWidth / 2 - 0.25].forEach(zPos => {
    const railGeo = new THREE.BoxGeometry(deckLength, 0.65, 0.12);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x98ABB9,
      metalness: 0.72,
      roughness: 0.32,
      wireframe: isWire,
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 3.2 + 0.52, zPos);
    rail.castShadow = true;
    deckGroup.add(rail);
  });
  root.add(deckGroup);

  // 3. Piers / Pillars (Substructure)
  const createPier = (id: ComponentId, xPos: number) => {
    const pierGroup = new THREE.Group();
    pierGroup.name = id;
    (pierGroup as any).componentId = id;

    // Foundation footing block (darker waterline mass concrete)
    const footingGeo = new THREE.BoxGeometry(6.2, 2.6, 10.2);
    const footing = new THREE.Mesh(
      footingGeo,
      getStructuralMaterial(id, 0x263342, 0.85, 0.1, false) // Keep dark foundation contrast
    );
    footing.position.set(xPos, -5.5, 0);
    footing.castShadow = true;
    footing.receiveShadow = true;
    pierGroup.add(footing);

    // Twin Reinforced Concrete Supporting Pillars (natural concrete grey)
    [-2.6, 2.6].forEach(zOffset => {
      const colGeo = new THREE.CylinderGeometry(1.25, 1.55, 7.5, 20);
      const col = new THREE.Mesh(
        colGeo,
        getStructuralMaterial(id, 0x788A9B, 0.75, 0.12, true)
      );
      col.position.set(xPos, -1.0, zOffset);
      col.castShadow = true;
      col.receiveShadow = true;
      pierGroup.add(col);
    });

    // Pier Cap supporting the deck bearings (medium structural concrete)
    const capGeo = new THREE.BoxGeometry(4.4, 1.25, 9.2);
    const cap = new THREE.Mesh(
      capGeo,
      getStructuralMaterial(id, 0x5E7082, 0.7, 0.2, true)
    );
    cap.position.set(xPos, 2.4, 0);
    cap.castShadow = true;
    pierGroup.add(cap);

    return pierGroup;
  };

  root.add(createPier('PILLAR_01', -18.0));
  root.add(createPier('PILLAR_02', 18.0));

  // 4. Stay Cable Towers & Stay Cables (Superstructure)
  const createCableStaySystem = (id: ComponentId, xPos: number) => {
    const sysGroup = new THREE.Group();
    sysGroup.name = id;
    (sysGroup as any).componentId = id;

    const towerHeight = 22;

    // Main A-frame Pylon Towers (Warm structural steel with terracotta copper tones in realistic mode)
    [-3.2, 3.2].forEach(zOffset => {
      const towerGeo = new THREE.BoxGeometry(1.45, towerHeight, 1.45);
      const tower = new THREE.Mesh(
        towerGeo,
        getStructuralMaterial(id, 0xB87042, 0.38, 0.44, true)
      );
      tower.position.set(xPos, 3.2 + towerHeight / 2, zOffset);
      tower.castShadow = true;
      tower.receiveShadow = true;
      sysGroup.add(tower);
    });

    // Top Cross-Beam (Structural graphite steel)
    const crossGeo = new THREE.BoxGeometry(1.65, 1.25, 7.9);
    const cross = new THREE.Mesh(
      crossGeo,
      getStructuralMaterial(id, 0x30485E, 0.5, 0.45, false) // Keep structural separation
    );
    cross.position.set(xPos, 3.2 + towerHeight - 1, 0);
    cross.castShadow = true;
    sysGroup.add(cross);

    // Stay Cables (Fan Pattern - Visible desaturated steel blue for crisp visibility)
    const cableColorHex = mode.renderMode === 'HEALTH_HEATMAP' ? 0x4D91D2 : 0x5D9FD6;
    const cableMat = new THREE.LineBasicMaterial({
      color: cableColorHex,
      linewidth: 2,
    });

    const towerApexY = 3.2 + towerHeight - 2;
    const anchorOffsets = [-16, -11, -6, 6, 11, 16];

    anchorOffsets.forEach(dx => {
      [-3.2, 3.2].forEach(zOffset => {
        const points = [
          new THREE.Vector3(xPos, towerApexY - Math.abs(dx) * 0.2, zOffset),
          new THREE.Vector3(xPos + dx, 3.5, zOffset * 0.95),
        ];
        const cableGeo = new THREE.BufferGeometry().setFromPoints(points);
        const cable = new THREE.Line(cableGeo, cableMat);
        sysGroup.add(cable);
      });
    });

    return sysGroup;
  };

  root.add(createCableStaySystem('CABLE_STAY_WEST', -18.0));
  root.add(createCableStaySystem('CABLE_STAY_EAST', 18.0));

  // 5. Abutment North (Shore connector - civil retaining concrete)
  const abutGroup = new THREE.Group();
  abutGroup.name = 'ABUTMENT_NORTH';
  (abutGroup as any).componentId = 'ABUTMENT_NORTH';

  const abutGeo = new THREE.BoxGeometry(6.2, 9.2, 12.2);
  const abut = new THREE.Mesh(
    abutGeo,
    getStructuralMaterial('ABUTMENT_NORTH', 0x566879, 0.75, 0.15, true)
  );
  abut.position.set(-39, -1, 0);
  abut.castShadow = true;
  abut.receiveShadow = true;
  abutGroup.add(abut);
  root.add(abutGroup);

  return root;
}
