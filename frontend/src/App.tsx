import React, { useEffect, useState } from 'react';
import { BridgeComponent, InspectionRecord, BridgeSummary, ComponentId } from './types';
import { fetchComponents, fetchBridgeSummary, fetchAllInspections } from './services/api';
import { BridgeCanvas } from './components/3d/BridgeCanvas';
import { ExplainabilityLab } from './components/dashboard/ExplainabilityLab';
import { TelemetryStudio } from './components/dashboard/TelemetryStudio';
import { ComplianceReport } from './components/dashboard/ComplianceReport';
import {
  Activity,
  Layers,
  Brain,
  Radio,
  FileText,
  RefreshCw,
  ShieldCheck,
  AlertOctagon,
  ChevronRight,
  X,
  Gauge,
  Workflow,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Check
} from 'lucide-react';

type TabView = 'MISSION_CONTROL' | 'AI_EXPLAINABILITY' | 'TELEMETRY' | 'REPORT';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>('MISSION_CONTROL');
  const [components, setComponents] = useState<BridgeComponent[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [summary, setSummary] = useState<BridgeSummary | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<ComponentId | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<InspectionRecord | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [comps, sum, insps] = await Promise.all([
        fetchComponents(),
        fetchBridgeSummary(),
        fetchAllInspections(),
      ]);
      setComponents(comps);
      setSummary(sum);
      setInspections(insps);
    } catch (e) {
      console.error('Failed to load bridge digital twin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDefectSelected = (defect: InspectionRecord) => {
    setSelectedDefect(defect);
    setSelectedComponentId(defect.componentId);
    setActiveTab('AI_EXPLAINABILITY');
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#101B2A] text-[#F1F5F8] overflow-hidden font-sans print:h-auto print:w-auto print:overflow-visible print:bg-white select-none">
      {/* =========================================================================
          Premium Modern Engineering Top Command Bar
          ========================================================================= */}
      <header className="h-14 border-b border-[#263B50] bg-[#19283A] px-4 flex items-center justify-between shrink-0 z-30 print:hidden shadow-lg">
        {/* Left: Platform Brand & Asset Identification */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#28A6A0] to-[#4D91D2] p-[1.5px] shadow-md">
            <div className="w-full h-full bg-[#19283A] rounded-[7px] flex items-center justify-center">
              <Workflow className="w-4 h-4 text-[#28A6A0]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold tracking-tight text-[#F1F5F8] uppercase font-mono">
                BRIDGE STRUCTURAL DIGITAL TWIN
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#203247] text-[#D69A55] border border-[#263B50]">
                CAB-BR-2026-X9
              </span>
            </div>
            <p className="text-[10px] text-[#B9C9D3] font-mono leading-none mt-0.5">
              Civil Infrastructure Real-Time Structural Telemetry & Explainable AI
            </p>
          </div>
        </div>

        {/* Center: 4 Premium Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#101B2A] p-1 rounded-xl border border-[#263B50] text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('MISSION_CONTROL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'MISSION_CONTROL'
                ? 'bg-[#203247] text-[#F1F5F8] border border-[#28A6A0] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${activeTab === 'MISSION_CONTROL' ? 'text-[#28A6A0]' : 'text-[#899EAF]'}`} />
            <span>3D Mission Control</span>
          </button>

          <button
            onClick={() => setActiveTab('AI_EXPLAINABILITY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'AI_EXPLAINABILITY'
                ? 'bg-[#203247] text-[#F1F5F8] border border-[#28A6A0] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <Brain className={`w-3.5 h-3.5 ${activeTab === 'AI_EXPLAINABILITY' ? 'text-[#28A6A0]' : 'text-[#899EAF]'}`} />
            <span>AI Explainability (Grad-CAM)</span>
          </button>

          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'TELEMETRY'
                ? 'bg-[#203247] text-[#F1F5F8] border border-[#28A6A0] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeTab === 'TELEMETRY' ? 'text-[#28A6A0]' : 'text-[#899EAF]'}`} />
            <span>Vibration & FFT Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'REPORT'
                ? 'bg-[#203247] text-[#F1F5F8] border border-[#28A6A0] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'REPORT' ? 'text-[#28A6A0]' : 'text-[#899EAF]'}`} />
            <span>Executive Report</span>
          </button>
        </nav>

        {/* Right: Global Telemetry Status HUD */}
        {summary && (
          <div className="flex items-center gap-2.5 text-xs font-mono">
            {/* Bridge Condition Index HUD */}
            <div className="flex items-center gap-2 bg-[#203247] px-3 py-1 rounded-lg border border-[#263B50] shadow-sm">
              <span className="text-[#899EAF] text-[10px] uppercase font-bold">BCI:</span>
              <span className={`text-xs font-bold font-mono ${
                summary.bridgeConditionIndex >= 90
                  ? 'text-[#43B58A]'
                  : summary.bridgeConditionIndex >= 75
                  ? 'text-[#E0B653]'
                  : 'text-[#DF6964]'
              }`}>
                {summary.bridgeConditionIndex}/100
              </span>
            </div>

            {/* Modal Resonant Frequency HUD */}
            <div className="flex items-center gap-2 bg-[#203247] px-3 py-1 rounded-lg border border-[#263B50] shadow-sm">
              <span className="text-[#899EAF] text-[10px] uppercase font-bold">f₀:</span>
              <span className="text-xs font-bold font-mono text-[#4D91D2]">
                {summary.currentNaturalFrequency} Hz
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-[#203247] hover:bg-[#263B50] border border-[#263B50] text-[#B9C9D3] hover:text-[#F1F5F8] transition-colors shadow-sm"
              title="Refresh Telemetry State"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#28A6A0]' : ''}`} />
            </button>
          </div>
        )}
      </header>

      {/* =========================================================================
          Main Workspace Canvas
          ========================================================================= */}
      <main className="flex-1 relative flex overflow-hidden print:overflow-visible print:h-auto print:static">
        {/* VIEW 1: 3D Mission Control (100% Full Viewport Screen Space) */}
        {activeTab === 'MISSION_CONTROL' && (
          <div className="flex-1 h-full w-full relative overflow-hidden">
            {/* 3D Digital Twin Viewport (Full Screen Width & Height) */}
            <BridgeCanvas
              components={components}
              inspections={inspections}
              summary={summary}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              onSelectDefect={handleDefectSelected}
              onSelectSensor={setSelectedSensorId}
              activeSensorId={selectedSensorId}
            />

            {/* Floating Engineering Inspector Card */}
            {selectedComponent && (
              <div className="absolute top-4 right-4 w-84 max-h-[calc(100%-2rem)] overflow-y-auto bg-[#203247]/95 border border-[#263B50] p-4 rounded-xl shadow-2xl z-20 flex flex-col justify-between gap-3.5 pointer-events-auto backdrop-blur-md">
                <div className="space-y-3.5">
                  {/* Top Bar with Category, Status and Close Button */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#263B50]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[#28A6A0] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#19283A] border border-[#263B50]">
                        {selectedComponent.category}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        selectedComponent.healthScore >= 90
                          ? 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                          : selectedComponent.healthScore >= 75
                          ? 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
                          : 'bg-[#DF6964]/15 text-[#DF6964] border-[#DF6964]/40'
                      }`}>
                        {selectedComponent.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedComponentId(null)}
                      title="Close Inspector"
                      className="p-1 rounded-lg text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Component Title & Technical ID */}
                  <div>
                    <h2 className="text-sm font-bold text-[#F1F5F8] leading-tight">
                      {selectedComponent.name}
                    </h2>
                    <span className="text-[10px] font-mono text-[#899EAF] flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#28A6A0]" />
                      Mesh Node ID: <span className="text-[#28A6A0] font-semibold">{selectedComponent.id}</span>
                    </span>
                  </div>

                  {/* Structural Health Rating Card */}
                  <div className="p-3.5 rounded-xl bg-[#19283A] border border-[#263B50] flex flex-col gap-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-[#899EAF] font-mono uppercase tracking-wider font-bold">
                          Structural Integrity Rating
                        </div>
                        <div className={`text-xl font-bold mt-0.5 font-mono tracking-tight ${
                          selectedComponent.healthScore >= 90 ? 'text-[#43B58A]' : selectedComponent.healthScore >= 75 ? 'text-[#E0B653]' : 'text-[#DF6964]'
                        }`}>
                          {selectedComponent.healthScore.toFixed(1)} <span className="text-xs text-[#899EAF] font-normal">/ 100</span>
                        </div>
                      </div>

                      <div className="w-11 h-11 rounded-lg border border-[#263B50] bg-[#203247] flex flex-col items-center justify-center font-mono font-bold text-xs text-[#F1F5F8] shadow-inner">
                        {Math.round(selectedComponent.healthScore)}%
                        <span className="text-[7px] text-[#899EAF] font-normal uppercase">Index</span>
                      </div>
                    </div>

                    {/* Continuous Health Percentage Bar */}
                    <div className="w-full h-2 rounded-full bg-[#101B2A] overflow-hidden border border-[#263B50]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          selectedComponent.healthScore >= 90 ? 'bg-[#43B58A]' : selectedComponent.healthScore >= 75 ? 'bg-[#E0B653]' : 'bg-[#DF6964]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, selectedComponent.healthScore))}%` }}
                      />
                    </div>
                  </div>

                  {/* Finite Element Stress Estimation */}
                  <div className="p-3 rounded-xl bg-[#19283A] border border-[#263B50] space-y-2 text-xs font-mono shadow-sm">
                    <div className="text-[9px] uppercase text-[#899EAF] tracking-wider font-bold flex items-center justify-between">
                      <span>FEA Stress State</span>
                      <span className="text-[#43B58A]">Yield SF: 5.8x</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#B9C9D3]">Dynamic Stress:</span>
                      <span className="text-[#F1F5F8] font-bold">42.8 MPa <span className="text-[8px] text-[#899EAF]">(&lt;250 MPa)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#B9C9D3]">3D Coordinates:</span>
                      <span className="text-[#4D91D2]">[{selectedComponent.coordinates.x}, {selectedComponent.coordinates.y}, {selectedComponent.coordinates.z}]</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#B9C9D3]">Active Defects:</span>
                      <span className={`font-bold ${selectedComponent.defectCount > 0 ? 'text-[#DF6964]' : 'text-[#43B58A]'}`}>
                        {selectedComponent.defectCount} Logged
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#B9C9D3]">Last Inspection:</span>
                      <span className="text-[#F1F5F8]">{selectedComponent.lastInspectionDate}</span>
                    </div>
                  </div>

                  {/* Quick Action: Open in Explainability Lab */}
                  <button
                    onClick={() => setActiveTab('AI_EXPLAINABILITY')}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#28A6A0] to-[#208A85] hover:brightness-110 text-[#FFFFFF] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Run Deep AI Diagnosis</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedComponentId(null)}
                  className="mt-2 w-full py-1.5 rounded-lg bg-[#19283A] hover:bg-[#263B50] border border-[#263B50] text-xs font-semibold text-[#B9C9D3] hover:text-[#F1F5F8] transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: AI Inspection & Explainability Lab */}
        {activeTab === 'AI_EXPLAINABILITY' && (
          <ExplainabilityLab
            components={components}
            inspections={inspections}
            onInspectionAdded={loadData}
            selectedComponentId={selectedComponentId}
            onSelectComponent={setSelectedComponentId}
          />
        )}

        {/* VIEW 3: Vibration & FFT Telemetry Studio */}
        {activeTab === 'TELEMETRY' && (
          <TelemetryStudio />
        )}

        {/* VIEW 4: Executive Compliance Report */}
        {activeTab === 'REPORT' && (
          <ComplianceReport
            summary={summary}
            components={components}
            inspections={inspections}
            onBack={() => setActiveTab('MISSION_CONTROL')}
          />
        )}
      </main>
    </div>
  );
}
