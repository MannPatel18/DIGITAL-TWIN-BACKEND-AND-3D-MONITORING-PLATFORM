const API_BASE_URL = 'http://localhost:8000';

export async function fetchComponents() {
  const res = await fetch(`${API_BASE_URL}/api/components`);
  if (!res.ok) throw new Error('Failed to fetch components');
  return res.json();
}

export async function fetchBridgeSummary() {
  const res = await fetch(`${API_BASE_URL}/api/summary`);
  if (!res.ok) throw new Error('Failed to fetch bridge summary');
  return res.json();
}

export async function fetchComponentDetail(componentId: string) {
  const res = await fetch(`${API_BASE_URL}/api/components/${componentId}`);
  if (!res.ok) throw new Error(`Failed to fetch component ${componentId}`);
  return res.json();
}

export async function fetchAllInspections() {
  const res = await fetch(`${API_BASE_URL}/api/inspections`);
  if (!res.ok) throw new Error('Failed to fetch inspections');
  return res.json();
}

export async function fetchTelemetrySnapshot(sensorId: string = 'SENSOR_DECK') {
  const res = await fetch(`${API_BASE_URL}/api/telemetry/snapshot?sensor_id=${sensorId}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry snapshot');
  return res.json();
}

export async function inspectComponent(componentId: string, file?: File, sampleType?: string) {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (sampleType) {
    formData.append('sample_type', sampleType);
  }

  const res = await fetch(`${API_BASE_URL}/api/inspect/${componentId}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Inspection request failed');
  return res.json();
}

export function createTelemetryWebSocket(onMessage: (data: any) => void) {
  const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing telemetry packet', e);
    }
  };
  return ws;
}
