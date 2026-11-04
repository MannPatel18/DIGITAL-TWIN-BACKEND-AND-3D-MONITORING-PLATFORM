import { BridgeComponent, BridgeSummary, InspectionRecord } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// =========================================================================
// High-Fidelity Inline SVG Texture Generators for Standalone Deployment
// =========================================================================
function createCrackSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="#2A3542"/>
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.15 0"/>
        <feComposite in2="SourceGraphic" in="gl" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
      </filter>
    </defs>
    <rect width="640" height="480" fill="#3D4B5C" opacity="0.6" filter="url(#noise)"/>
    <!-- Concrete Surface Aggregate Specks -->
    <circle cx="120" cy="80" r="3" fill="#1C242E"/>
    <circle cx="280" cy="140" r="4" fill="#202A36"/>
    <circle cx="450" cy="90" r="3" fill="#1E2733"/>
    <circle cx="510" cy="320" r="4" fill="#1C242E"/>
    <circle cx="180" cy="380" r="3" fill="#222C38"/>
    <!-- Shear Crack Path -->
    <path d="M 280 40 Q 285 100 295 150 T 290 220 T 310 300 T 305 380 T 320 440" stroke="#12171E" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <!-- Fissure Core -->
    <path d="M 280 40 Q 285 100 295 150 T 290 220 T 310 300 T 305 380 T 320 440" stroke="#0A0E13" stroke-width="2.5" fill="none"/>
    <!-- Branch Cracks -->
    <path d="M 295 150 L 330 175" stroke="#1A222C" stroke-width="2" fill="none"/>
    <path d="M 290 220 L 260 240" stroke="#1A222C" stroke-width="2" fill="none"/>
    <path d="M 310 300 L 345 325" stroke="#1A222C" stroke-width="2" fill="none"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createGradCamSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <!-- Underlay Dark Concrete -->
    <rect width="640" height="480" fill="#1E2733"/>
    <defs>
      <!-- Thermal Grad-CAM Jet Colormap Radial Gradient -->
      <radialGradient id="gradcamAttention" cx="47%" cy="52%" r="38%">
        <stop offset="0%" stop-color="#E53E3E" stop-opacity="0.88"/>
        <stop offset="28%" stop-color="#ED8936" stop-opacity="0.75"/>
        <stop offset="55%" stop-color="#ECC94B" stop-opacity="0.55"/>
        <stop offset="78%" stop-color="#38B2AC" stop-opacity="0.30"/>
        <stop offset="94%" stop-color="#3182CE" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#2B6CB0" stop-opacity="0.0"/>
      </radialGradient>
    </defs>
    <!-- Crack Underlay Silhouette -->
    <path d="M 280 40 Q 285 100 295 150 T 290 220 T 310 300 T 305 380 T 320 440" stroke="#000000" stroke-width="4" fill="none" opacity="0.6"/>
    <!-- AI Attention Saliency Heatmap Overlay -->
    <rect width="640" height="480" fill="url(#gradcamAttention)"/>
    <!-- Peak Convolutional Activation Core -->
    <circle cx="300" cy="250" r="42" fill="#E53E3E" opacity="0.5" filter="blur(8px)"/>
    <!-- Bounding Box Annotation -->
    <rect x="250" y="130" width="115" height="230" fill="none" stroke="#28A6A0" stroke-width="2" stroke-dasharray="6 4" rx="4"/>
    <rect x="250" y="110" width="115" height="18" fill="#28A6A0" rx="2"/>
    <text x="254" y="123" fill="#FFFFFF" font-family="monospace" font-size="10" font-weight="bold">FATIGUE CRACK 96.4%</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createCorrosionSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="#4A5568"/>
    <defs>
      <radialGradient id="rustSpall" cx="50%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#9C4221" stop-opacity="0.95"/>
        <stop offset="35%" stop-color="#C05621" stop-opacity="0.90"/>
        <stop offset="70%" stop-color="#DD6B20" stop-opacity="0.65"/>
        <stop offset="92%" stop-color="#718096" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#4A5568" stop-opacity="0.0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="480" fill="url(#rustSpall)"/>
    <circle cx="320" cy="240" r="95" fill="#7B341E" opacity="0.8"/>
    <circle cx="340" cy="230" r="50" fill="#5A2414" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// =========================================================================
// Default Resilient Standalone Data
// =========================================================================
export const FALLBACK_COMPONENTS: BridgeComponent[] = [
  {
    id: 'PILLAR_01',
    name: 'Pillar 1 (Pier West - Substructure)',
    category: 'SUBSTRUCTURE',
    healthScore: 64.0,
    status: 'WARNING',
    defectCount: 1,
    coordinates: { x: -18.0, y: -4.0, z: 0.0 },
    lastInspectionDate: '2026-11-04 10:30',
    inspectionHistory: [],
  },
  {
    id: 'PILLAR_02',
    name: 'Pillar 2 (Pier East - Substructure)',
    category: 'SUBSTRUCTURE',
    healthScore: 94.5,
    status: 'OPTIMAL',
    defectCount: 0,
    coordinates: { x: 18.0, y: -4.0, z: 0.0 },
    lastInspectionDate: '2026-11-03 14:15',
    inspectionHistory: [],
  },
  {
    id: 'DECK_MIDSPAN',
    name: 'Main Deck Span (Superstructure)',
    category: 'SUPERSTRUCTURE',
    healthScore: 82.0,
    status: 'ADVISORY',
    defectCount: 1,
    coordinates: { x: 0.0, y: 3.2, z: 0.0 },
    lastInspectionDate: '2026-11-02 09:45',
    inspectionHistory: [],
  },
  {
    id: 'CABLE_STAY_WEST',
    name: 'Stay Cables & Tower West',
    category: 'SUPERSTRUCTURE',
    healthScore: 97.0,
    status: 'OPTIMAL',
    defectCount: 0,
    coordinates: { x: -18.0, y: 12.0, z: 0.0 },
    lastInspectionDate: '2026-11-01 16:00',
    inspectionHistory: [],
  },
  {
    id: 'CABLE_STAY_EAST',
    name: 'Stay Cables & Tower East',
    category: 'SUPERSTRUCTURE',
    healthScore: 96.0,
    status: 'OPTIMAL',
    defectCount: 0,
    coordinates: { x: 18.0, y: 12.0, z: 0.0 },
    lastInspectionDate: '2026-11-01 16:00',
    inspectionHistory: [],
  },
  {
    id: 'ABUTMENT_NORTH',
    name: 'North Approach Abutment',
    category: 'SUBSTRUCTURE',
    healthScore: 91.0,
    status: 'OPTIMAL',
    defectCount: 0,
    coordinates: { x: -36.0, y: 1.0, z: 0.0 },
    lastInspectionDate: '2026-10-28 11:20',
    inspectionHistory: [],
  },
];

export const FALLBACK_SUMMARY: BridgeSummary = {
  bridgeConditionIndex: 80.4,
  status: 'ADVISORY',
  totalInspections: 2,
  criticalDefects: 1,
  activeSensors: 3,
  naturalFrequencyBaseline: 0.850,
  currentNaturalFrequency: 0.795,
  components: FALLBACK_COMPONENTS,
};

export const FALLBACK_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'INSP-2026-001',
    componentId: 'PILLAR_01',
    timestamp: '2026-11-04 10:30',
    imageFileName: 'pier1_fatigue_crack.jpg',
    imageUrl: createCrackSvgDataUrl(),
    gradcamUrl: createGradCamSvgDataUrl(),
    damageType: 'CRACK',
    severity: 'CRITICAL',
    confidence: 0.964,
    explainabilityScore: 0.948,
    crackLengthMm: 18.4,
    defectAreaCm2: 4.8,
    notes: 'Subsurface shear crack extending across concrete pillar shaft; epoxy injection remediation advised.',
    coordinates: { x: -18.0, y: -1.2, z: 1.25 },
    healthScore: 64.0,
  },
  {
    id: 'INSP-2026-002',
    componentId: 'DECK_MIDSPAN',
    timestamp: '2026-11-02 09:45',
    imageFileName: 'deck_steel_corrosion.jpg',
    imageUrl: createCorrosionSvgDataUrl(),
    gradcamUrl: createGradCamSvgDataUrl(),
    damageType: 'CORROSION',
    severity: 'MODERATE',
    confidence: 0.912,
    explainabilityScore: 0.892,
    crackLengthMm: 0.0,
    defectAreaCm2: 28.5,
    notes: 'Flange surface oxidation and rust spalling detected at mid-span box girder.',
    coordinates: { x: 0.0, y: 3.2, z: 2.1 },
    healthScore: 82.0,
  },
];

// =========================================================================
// API Methods with Graceful Standalone Fallback
// =========================================================================

export async function fetchComponents(): Promise<BridgeComponent[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/components`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API not available');
    return await res.json();
  } catch {
    return FALLBACK_COMPONENTS;
  }
}

export async function fetchBridgeSummary(): Promise<BridgeSummary> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/summary`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API not available');
    return await res.json();
  } catch {
    return FALLBACK_SUMMARY;
  }
}

export async function fetchComponentDetail(componentId: string): Promise<BridgeComponent> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/components/${componentId}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`Failed to fetch component ${componentId}`);
    return await res.json();
  } catch {
    const match = FALLBACK_COMPONENTS.find(c => c.id === componentId);
    if (!match) throw new Error(`Component ${componentId} not found`);
    return match;
  }
}

export async function fetchAllInspections(): Promise<InspectionRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/inspections`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API not available');
    return await res.json();
  } catch {
    return FALLBACK_INSPECTIONS;
  }
}

export async function fetchTelemetrySnapshot(sensorId: string = 'SENSOR_DECK'): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/telemetry/snapshot?sensor_id=${sensorId}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API not available');
    return await res.json();
  } catch {
    return generateSimulatedTelemetryPacket(sensorId, 0);
  }
}

export async function inspectComponent(componentId: string, file?: File, sampleType?: string): Promise<any> {
  try {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (sampleType) formData.append('sample_type', sampleType);

    const res = await fetch(`${API_BASE_URL}/api/inspect/${componentId}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) throw new Error('Inspection request failed');
    return await res.json();
  } catch {
    // Client-side simulated AI inspection for standalone preview
    const isClean = sampleType === 'CLEAN';
    const isCorrosion = sampleType === 'CORROSION';
    const damageType = isClean ? 'NONE' : isCorrosion ? 'CORROSION' : 'CRACK';
    const severity = isClean ? 'NOMINAL' : isCorrosion ? 'MODERATE' : 'CRITICAL';
    const score = isClean ? 98.5 : isCorrosion ? 78.0 : 62.0;

    return {
      success: true,
      inspection: {
        id: `INSP-${Date.now().toString().slice(-6)}`,
        componentId: componentId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        imageUrl: isClean ? createCrackSvgDataUrl() : isCorrosion ? createCorrosionSvgDataUrl() : createCrackSvgDataUrl(),
        gradcamUrl: createGradCamSvgDataUrl(),
        damageType: damageType,
        severity: severity,
        confidence: isClean ? 0.98 : 0.94,
        explainabilityScore: 0.93,
        crackLengthMm: isClean ? 0.0 : isCorrosion ? 0.0 : 16.5,
        defectAreaCm2: isClean ? 0.0 : isCorrosion ? 24.0 : 5.2,
        healthScore: score,
        notes: `Automated AI Grad-CAM evaluation completed for ${componentId}.`,
        coordinates: { x: -18.0, y: -1.5, z: 1.2 },
      },
      updatedComponentHealth: {
        health_score: score,
        status: isClean ? 'OPTIMAL' : isCorrosion ? 'ADVISORY' : 'WARNING',
      }
    };
  }
}

// Client-side telemetry simulation generator
function generateSimulatedTelemetryPacket(sensorId: string, step: number) {
  const points = 40;
  const timeArray: number[] = [];
  const accelYArray: number[] = [];
  const f0 = 0.795;
  const now = Date.now() / 1000;

  for (let i = 0; i < points; i++) {
    const t = (step * 0.1) + (i * 0.01);
    timeArray.push(Number(t.toFixed(2)));
    // Real-time sinusoidal excitation + random ambient vibration
    const wave = (Math.sin(2 * Math.PI * f0 * t) * 0.08) +
                 (Math.sin(2 * Math.PI * 2.45 * t) * 0.02) +
                 ((Math.random() - 0.5) * 0.02);
    accelYArray.push(Number(wave.toFixed(4)));
  }

  // Generate 20-bin FFT power spectrum
  const frequencies = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.5, 4.0, 4.5, 5.0];
  const amplitudes = frequencies.map(f => {
    // Resonant peak around 0.8 Hz
    const dist = Math.abs(f - 0.8);
    const peak = Math.exp(-dist * dist / 0.04) * 0.85;
    const secondary = Math.exp(-Math.pow(f - 2.4, 2) / 0.15) * 0.22;
    return Number((peak + secondary + Math.random() * 0.03).toFixed(4));
  });

  return {
    sensor_id: sensorId,
    timestamp: now,
    natural_frequency_hz: f0,
    current_frequency_hz: f0,
    baseline_frequency_hz: 0.850,
    frequency_shift_pct: -6.47,
    peak_acceleration_g: 0.1366,
    temperature_c: 26.4,
    strain_microstrain: 226.9,
    time_series: {
      time: timeArray,
      accel_y: accelYArray,
    },
    fft_spectrum: {
      frequencies: frequencies,
      amplitudes: amplitudes,
    }
  };
}

export function createTelemetryWebSocket(onMessage: (data: any) => void) {
  let isFallback = false;
  let timer: any = null;
  let step = 0;

  try {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/telemetry`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Error parsing telemetry packet', e);
      }
    };

    ws.onerror = () => {
      if (!isFallback) {
        isFallback = true;
        timer = setInterval(() => {
          step++;
          onMessage(generateSimulatedTelemetryPacket('SENSOR_DECK', step));
        }, 150);
      }
    };

    return ws;
  } catch {
    // Direct fallback simulation if WebSocket URL construction fails
    timer = setInterval(() => {
      step++;
      onMessage(generateSimulatedTelemetryPacket('SENSOR_DECK', step));
    }, 150);

    return {
      close: () => {
        if (timer) clearInterval(timer);
      }
    } as any;
  }
}
