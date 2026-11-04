export type ComponentId = 'PILLAR_01' | 'PILLAR_02' | 'DECK_MIDSPAN' | 'CABLE_STAY_EAST' | 'CABLE_STAY_WEST' | 'ABUTMENT_NORTH';

export type DamageSeverity = 'NOMINAL' | 'MINOR' | 'MODERATE' | 'CRITICAL';
export type DamageType = 'CRACK' | 'CORROSION' | 'SPALLING' | 'FATIGUE_VOID' | 'NONE';

export interface BridgeComponent {
  id: ComponentId;
  name: string;
  category: 'SUBSTRUCTURE' | 'SUPERSTRUCTURE';
  healthScore: number; // 0 to 100
  status: 'OPTIMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  defectCount: number;
  lastInspectionDate: string;
  coordinates: { x: number; y: number; z: number };
  inspectionHistory: InspectionRecord[];
}

export interface InspectionRecord {
  id: string;
  componentId: ComponentId;
  timestamp: string;
  imageFileName: string;
  imageUrl: string;
  gradcamUrl: string;
  damageType: DamageType;
  severity: DamageSeverity;
  confidence: number; // 0.0 to 1.0
  explainabilityScore: number; // e.g. 0.92 IoU / attention focus
  crackLengthMm?: number;
  defectAreaCm2?: number;
  healthScore?: number;
  notes: string;
  coordinates: { x: number; y: number; z: number };
}

export interface SensorTelemetryPacket {
  timestamp: number;
  sensorId: string;
  componentId: ComponentId;
  accelerationX: number; // in g
  accelerationY: number; // in g
  accelerationZ: number; // in g
  naturalFrequencyHz: number; // f0
  frequencyShiftPercent: number; // Delta f
  temperatureC: number;
  strainMicrostrain: number;
}

export interface BridgeSummary {
  bridgeConditionIndex: number; // 0 to 100
  status: 'AIRWORTHY' | 'ADVISORY' | 'MAINTENANCE_REQUIRED' | 'GROUNDED';
  totalInspections: number;
  criticalDefects: number;
  activeSensors: number;
  naturalFrequencyBaseline: number;
  currentNaturalFrequency: number;
  components: BridgeComponent[];
}
