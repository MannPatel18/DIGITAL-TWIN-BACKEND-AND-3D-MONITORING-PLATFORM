import * as THREE from 'three';
import { InspectionRecord } from '../../types';

export interface SensorMarkerConfig {
  id: string;
  name: string;
  componentId: string;
  position: [number, number, number];
}

export const BRIDGE_SENSORS: SensorMarkerConfig[] = [
  { id: 'SENSOR_P1', name: 'Pillar 1 Accelerometer Node', componentId: 'PILLAR_01', position: [-18.0, 2.8, 3.8] },
  { id: 'SENSOR_DECK', name: 'Mid-Span Deck Accelerometer', componentId: 'DECK_MIDSPAN', position: [0.0, 4.0, 0.0] },
  { id: 'SENSOR_P2', name: 'Pillar 2 Accelerometer Node', componentId: 'PILLAR_02', position: [18.0, 2.8, 3.8] }
];

export function createSensorMarkersGroup(
  onSensorClick?: (sensorId: string) => void
): { group: THREE.Group; update: (time: number) => void } {
  const group = new THREE.Group();
  group.name = 'SensorsGroup';

  const pulseMeshes: THREE.Mesh[] = [];

  BRIDGE_SENSORS.forEach(cfg => {
    const sensorObj = new THREE.Group();
    sensorObj.position.set(...cfg.position);
    (sensorObj as any).sensorId = cfg.id;

    // Center Core (Rich Teal Octahedron #28A6A0)
    const coreGeo = new THREE.OctahedronGeometry(0.38);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x28A6A0 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    sensorObj.add(core);

    // Dynamic Outer Sensor Pulse Ring
    const ringGeo = new THREE.RingGeometry(0.42, 0.68, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x28A6A0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    sensorObj.add(ring);
    pulseMeshes.push(ring);

    // Steel Blue Mounting Stanchion (#4D91D2)
    const stemGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.85);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x4D91D2 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -0.42;
    sensorObj.add(stem);

    group.add(sensorObj);
  });

  const update = (time: number) => {
    const scale = 1.0 + Math.sin(time * 3) * 0.18;
    pulseMeshes.forEach(mesh => {
      mesh.scale.set(scale, scale, scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 - (scale - 0.8) * 0.4;
    });
  };

  return { group, update };
}

export function createDefectHotspotsGroup(
  inspections: InspectionRecord[],
  onDefectClick?: (record: InspectionRecord) => void
): { group: THREE.Group; update: (time: number) => void } {
  const group = new THREE.Group();
  group.name = 'DefectsGroup';

  const pulseRings: THREE.Mesh[] = [];

  inspections.forEach(insp => {
    const hotspot = new THREE.Group();
    hotspot.position.set(insp.coordinates.x, insp.coordinates.y, insp.coordinates.z);
    (hotspot as any).inspectionRecord = insp;

    const isCritical = insp.severity === 'CRITICAL';
    const isModerate = insp.severity === 'MODERATE';
    // Warning: Amber #E0B653, Critical: Muted Red #DF6964, Healthy: Rich Green #43B58A
    const colorHex = isCritical ? 0xDF6964 : isModerate ? 0xE0B653 : 0x43B58A;

    // Core alert marker
    const dotGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    hotspot.add(dot);

    // Controlled alert halo
    const haloGeo = new THREE.RingGeometry(0.36, 0.65, 28);
    const haloMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    hotspot.add(halo);
    pulseRings.push(halo);

    group.add(hotspot);
  });

  const update = (time: number) => {
    const scale = 1.0 + Math.sin(time * 2.8 + 1) * 0.22;
    pulseRings.forEach(mesh => {
      mesh.scale.set(scale, scale, scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 - (scale - 0.75) * 0.45;
    });
  };

  return { group, update };
}
