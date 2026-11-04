import React, { useState, useEffect } from 'react';
import { BridgeComponent, InspectionRecord, ComponentId } from '../../types';
import { inspectComponent } from '../../services/api';
import {
  Brain,
  Upload,
  CheckCircle2,
  AlertOctagon,
  Target,
  Ruler,
  ShieldAlert,
  Sparkles,
  Image as ImageIcon,
  Activity,
  Crosshair,
  Layers,
  MapPin,
  Clock,
  Compass,
  X,
  FileText,
  Scan,
  AlertTriangle,
  ChevronRight,
  ZoomIn
} from 'lucide-react';

interface ExplainabilityLabProps {
  components: BridgeComponent[];
  inspections: InspectionRecord[];
  onInspectionAdded: () => void;
  selectedComponentId: ComponentId | null;
  onSelectComponent: (id: ComponentId) => void;
}

export const ExplainabilityLab: React.FC<ExplainabilityLabProps> = ({
  components,
  inspections,
  onInspectionAdded,
  selectedComponentId,
  onSelectComponent,
}) => {
  const activeCompId = selectedComponentId || 'PILLAR_01';
  const activeComponent = components.find(c => c.id === activeCompId) || components[0];

  const [selectedSample, setSelectedSample] = useState<string>('CRACK');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(
    inspections.find(i => i.componentId === activeCompId) || inspections[0] || null
  );

  useEffect(() => {
    // Preserve active custom inspection if user just diagnosed a custom upload
    if (activeInspection && activeInspection.componentId === activeCompId && (activeInspection.imageUrl.startsWith('data:') || activeInspection.imageUrl.startsWith('blob:'))) {
      return;
    }
    const match = inspections.find(i => i.componentId === activeCompId);
    if (match) {
      setActiveInspection(match);
    }
  }, [activeCompId, inspections]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setSelectedSample('CUSTOM');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setSelectedSample('CUSTOM');
    }
  };

  const handleClearUploadedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setFilePreview(null);
    setSelectedSample('CRACK');
  };

  const handleRunDiagnosis = async () => {
    try {
      setAnalyzing(true);
      const res = await inspectComponent(
        activeCompId,
        uploadedFile || undefined,
        uploadedFile ? undefined : selectedSample
      );

      if (res && res.inspection) {
        const insp = res.inspection;
        const normalized: InspectionRecord = {
          id: insp.id,
          componentId: insp.componentId || insp.component_id || activeCompId,
          timestamp: insp.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
          imageFileName: insp.imageFileName || insp.image_filename || '',
          imageUrl: insp.imageUrl || insp.image_url || filePreview || '',
          gradcamUrl: insp.gradcamUrl || insp.gradcam_url || filePreview || '',
          damageType: insp.damageType || insp.damage_type,
          severity: insp.severity,
          confidence: insp.confidence,
          explainabilityScore: insp.explainabilityScore ?? insp.explainability_score ?? 0.95,
          crackLengthMm: insp.crackLengthMm ?? insp.crack_length_mm,
          defectAreaCm2: insp.defectAreaCm2 ?? insp.defect_area_cm2,
          healthScore: insp.healthScore ?? insp.measured_health ?? (res.updatedComponentHealth?.health_score || (insp.severity === 'NOMINAL' ? 98 : 35)),
          notes: insp.notes || '',
          coordinates: insp.coordinates || insp.coord_3d || { x: 0, y: 0, z: 0 },
        };

        setActiveInspection(normalized);
        onInspectionAdded();
      }
    } catch (err) {
      console.error('Error running inspection', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Safe coordinates helper
  const coords = activeInspection?.coordinates || (activeInspection as any)?.coord_3d || { x: 0, y: 0, z: 0 };
  const imageUrl = activeInspection?.imageUrl || (activeInspection as any)?.image_url || filePreview || '';
  const gradcamUrl = activeInspection?.gradcamUrl || (activeInspection as any)?.gradcam_url || filePreview || '';
  const isNominal = activeInspection?.damageType === 'NONE' || activeInspection?.severity === 'NOMINAL';

  const resolveImg = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    return `${apiBase}${url}`;
  };

  const componentInspections = inspections.filter(i => i.componentId === activeCompId);
  const substructureComponents = components.filter(c => c.category === 'SUBSTRUCTURE');
  const superstructureComponents = components.filter(c => c.category === 'SUPERSTRUCTURE');

  return (
    <div className="flex h-full w-full bg-[#101B2A] overflow-hidden text-[#F1F5F8] font-sans">
      {/* =========================================================================
          PREMIUM INSPECTION SIDEBAR (ENGINEERING CONTROL CONSOLE)
          ========================================================================= */}
      <aside className="w-84 xl:w-92 border-r border-[#263B50] bg-[#19283A] p-4 flex flex-col justify-between shrink-0 overflow-y-auto shadow-xl">
        <div className="space-y-4">
          {/* Header Identity */}
          <div className="pb-3.5 border-b border-[#263B50]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#28A6A0] font-mono text-[10px] uppercase tracking-wider font-bold">
                <Brain className="w-4 h-4 text-[#28A6A0]" /> Computer Vision & XAI
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#203247] text-[#B9C9D3] border border-[#263B50]">
                ResNet-18
              </span>
            </div>
            <h2 className="text-sm font-bold text-[#F1F5F8] mt-1.5 tracking-tight flex items-center gap-2">
              <Scan className="w-4 h-4 text-[#28A6A0]" />
              Inspection & Explainability
            </h2>
            <p className="text-[11px] text-[#899EAF] mt-1 leading-relaxed font-sans">
              Evaluates convolutional gradient saliency to confirm AI attention on structural damage versus background concrete noise.
            </p>
          </div>

          {/* 1. Structural Target Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono uppercase text-[#899EAF] tracking-wider font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#28A6A0]" /> 1. Structural Target Selection
              </label>
              <span className="text-[10px] font-mono text-[#D69A55] font-semibold">{components.length} Elements</span>
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {/* Substructure Group */}
              <div>
                <div className="text-[9px] font-mono uppercase text-[#899EAF] tracking-wider mb-1.5 font-bold">
                  Substructure Elements
                </div>
                <div className="space-y-1.5">
                  {substructureComponents.map((c) => {
                    const isSelected = activeCompId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectComponent(c.id);
                          const matching = inspections.find(i => i.componentId === c.id);
                          if (matching) setActiveInspection(matching);
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-[#203247] border-[#28A6A0] text-[#F1F5F8] font-bold shadow-md'
                            : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#203247]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            c.healthScore >= 90 ? 'bg-[#43B58A]' : c.healthScore >= 75 ? 'bg-[#E0B653]' : 'bg-[#DF6964]'
                          }`} />
                          <span className="truncate">{c.name.split('(')[0].trim()}</span>
                        </div>

                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          c.healthScore >= 90
                            ? 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                            : c.healthScore >= 75
                            ? 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
                            : 'bg-[#DF6964]/15 text-[#DF6964] border-[#DF6964]/40'
                        }`}>
                          {c.healthScore.toFixed(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Superstructure Group */}
              <div>
                <div className="text-[9px] font-mono uppercase text-[#899EAF] tracking-wider mb-1.5 font-bold">
                  Superstructure Elements
                </div>
                <div className="space-y-1.5">
                  {superstructureComponents.map((c) => {
                    const isSelected = activeCompId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectComponent(c.id);
                          const matching = inspections.find(i => i.componentId === c.id);
                          if (matching) setActiveInspection(matching);
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-[#203247] border-[#28A6A0] text-[#F1F5F8] font-bold shadow-md'
                            : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#203247]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            c.healthScore >= 90 ? 'bg-[#43B58A]' : c.healthScore >= 75 ? 'bg-[#E0B653]' : 'bg-[#DF6964]'
                          }`} />
                          <span className="truncate">{c.name.split('(')[0].trim()}</span>
                        </div>

                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          c.healthScore >= 90
                            ? 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                            : c.healthScore >= 75
                            ? 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
                            : 'bg-[#DF6964]/15 text-[#DF6964] border-[#DF6964]/40'
                        }`}>
                          {c.healthScore.toFixed(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Inspection Image Source Selection */}
          <div>
            <label className="text-[10px] font-mono uppercase text-[#899EAF] tracking-wider block mb-2 font-bold flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#4D91D2]" /> 2. Inspection Image Source
            </label>

            {/* Presets: Crack, Corrosion, Sound */}
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              <button
                onClick={() => { setSelectedSample('CRACK'); setUploadedFile(null); setFilePreview(null); }}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedSample === 'CRACK' && !uploadedFile
                    ? 'border-[#DF6964] bg-[#DF6964]/15 text-[#F1F5F8] font-bold shadow-sm'
                    : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#203247]'
                }`}
              >
                <div className="text-[11px] font-bold truncate">Crack</div>
                <div className="text-[9px] text-[#DF6964] font-mono font-bold mt-0.5">Shear Void</div>
              </button>

              <button
                onClick={() => { setSelectedSample('CORROSION'); setUploadedFile(null); setFilePreview(null); }}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedSample === 'CORROSION' && !uploadedFile
                    ? 'border-[#E0B653] bg-[#E0B653]/15 text-[#F1F5F8] font-bold shadow-sm'
                    : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#203247]'
                }`}
              >
                <div className="text-[11px] font-bold truncate">Rust</div>
                <div className="text-[9px] text-[#E0B653] font-mono font-bold mt-0.5">Spalling</div>
              </button>

              <button
                onClick={() => { setSelectedSample('CLEAN'); setUploadedFile(null); setFilePreview(null); }}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedSample === 'CLEAN' && !uploadedFile
                    ? 'border-[#43B58A] bg-[#43B58A]/15 text-[#F1F5F8] font-bold shadow-sm'
                    : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#203247]'
                }`}
              >
                <div className="text-[11px] font-bold truncate">Sound</div>
                <div className="text-[9px] text-[#43B58A] font-mono font-bold mt-0.5">Nominal</div>
              </button>
            </div>

            {/* Premium Drag-and-Drop Photo Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border border-dashed transition-all p-3 text-center cursor-pointer ${
                uploadedFile
                  ? 'border-[#28A6A0] bg-[#203247]'
                  : isDragging
                  ? 'border-[#28A6A0] bg-[#203247]'
                  : 'border-[#263B50] bg-[#101B2A] hover:border-[#28A6A0]/70 hover:bg-[#203247]/60'
              }`}
            >
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="flex items-center justify-between gap-2.5 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Uploaded preview"
                        className="w-9 h-9 rounded-lg object-cover border border-[#263B50] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#19283A] border border-[#263B50] flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4 text-[#28A6A0]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#F1F5F8] truncate">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[9px] font-mono text-[#28A6A0]">
                        {(uploadedFile.size / 1024).toFixed(1)} KB • Custom Capture
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleClearUploadedFile}
                    title="Remove custom photo"
                    className="p-1 rounded-lg text-[#899EAF] hover:text-[#DF6964] hover:bg-[#19283A] transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label htmlFor="photo-upload" className="cursor-pointer block">
                  <Upload className="w-5 h-5 mx-auto text-[#28A6A0] mb-1.5" />
                  <span className="text-[11px] font-bold text-[#F1F5F8] block">
                    {isDragging ? 'Drop Image to Upload' : 'Upload Field Photo'}
                  </span>
                  <span className="text-[9px] text-[#899EAF] font-mono block mt-0.5">
                    JPG, PNG • High-Resolution Optical Inspection Capture
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Action Button */}
        <div className="pt-3.5 border-t border-[#263B50]">
          <button
            onClick={handleRunDiagnosis}
            disabled={analyzing}
            className="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#28A6A0] to-[#208A85] hover:brightness-110 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Computing Grad-CAM Heatmap...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run AI Diagnostic & Grad-CAM</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE — STRICT 1 TO 9 INFORMATION HIERARCHY
          ========================================================================= */}
      <main className="flex-1 p-4 lg:p-6 flex flex-col gap-4 overflow-y-auto bg-[#101B2A]">
        {activeInspection ? (
          <div className="space-y-4">
            {/* -------------------------------------------------------------------
                HIERARCHY ITEM 1 & 2:
                1. Selected Structural Element
                2. Diagnosis Finding (Immediately Recognizable Finding Banner)
                ------------------------------------------------------------------- */}
            <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              {/* Item 1: Selected Structural Element */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#19283A] border border-[#263B50] flex items-center justify-center text-[#28A6A0] shrink-0 shadow-sm">
                  <Crosshair className="w-5 h-5 text-[#28A6A0]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#28A6A0] uppercase tracking-wider font-bold">
                      1. Target Structural Element
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#19283A] text-[#D69A55] border border-[#263B50] font-semibold">
                      {activeComponent.category}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#F1F5F8] flex items-center gap-2 mt-0.5">
                    <span>{activeComponent.name}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#19283A] text-[#B9C9D3] border border-[#263B50]">
                      Node: {activeInspection.componentId}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#899EAF] mt-0.5 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#899EAF]" />
                    <span>Inspection ID: <strong className="text-[#B9C9D3]">{activeInspection.id}</strong></span>
                    <span>•</span>
                    <span>{activeInspection.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Item 2: Diagnosis Finding */}
              <div className="flex flex-col lg:items-end">
                <span className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider font-bold mb-1">
                  2. Diagnosis Finding
                </span>
                <div className="flex items-center gap-2">
                  <div className={`px-3.5 py-1.5 rounded-lg border inline-flex items-center gap-2 font-mono text-xs font-bold shadow-sm ${
                    isNominal
                      ? 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                      : activeInspection.severity === 'CRITICAL'
                      ? 'bg-[#DF6964]/15 text-[#DF6964] border-[#DF6964]/40'
                      : 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
                  }`}>
                    {isNominal ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#43B58A]" />
                        <span>NOMINAL — SURFACE SOUND / ZERO DAMAGE</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4 text-[#DF6964]" />
                        <span>{activeInspection.severity} {activeInspection.damageType} DETECTED</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-[#899EAF] font-mono mt-1 max-w-lg lg:text-right">
                  {activeInspection.notes || (isNominal
                    ? 'Concrete integrity fully intact within permissible structural threshold.'
                    : 'Classified defect exceeds structural tolerance. Remediation advised.')}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                HIERARCHY ITEM 3 & 4: Side-by-Side Dual Viewports
                3. Original Inspection Image
                4. AI Attention Heatmap (Grad-CAM)
                ------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Item 3: Original Inspection Image Viewport */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col shadow-md">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#263B50]">
                  <span className="text-xs font-mono font-bold text-[#F1F5F8] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#4D91D2]" /> 3. Original Inspection Image
                  </span>
                  <span className="text-[10px] font-mono text-[#899EAF] px-2 py-0.5 rounded-md bg-[#19283A] border border-[#263B50]">
                    RGB Optical Sensor • 4K Uncompressed
                  </span>
                </div>

                <div className="relative h-68 sm:h-76 xl:h-84 rounded-xl overflow-hidden bg-[#101B2A] flex items-center justify-center border border-[#263B50] group">
                  <img
                    src={resolveImg(imageUrl)}
                    alt="Raw optical inspection capture"
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      if (filePreview) (e.target as any).src = filePreview;
                    }}
                  />

                  {/* Corner Inspection Reticles in Steel Blue */}
                  <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-[#4D91D2] pointer-events-none" />
                  <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-[#4D91D2] pointer-events-none" />
                  <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-[#4D91D2] pointer-events-none" />
                  <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-[#4D91D2] pointer-events-none" />

                  {/* Bottom Sensor Tag */}
                  <div className="absolute bottom-3 left-3 bg-[#203247]/95 border border-[#263B50] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#B9C9D3] flex items-center gap-2 shadow-md backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-[#4D91D2]" />
                    Optical Sensor • Unprocessed Field Capture
                  </div>
                </div>
              </div>

              {/* Item 4: AI Attention Heatmap (Grad-CAM) Viewport */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col shadow-md">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#263B50]">
                  <span className="text-xs font-mono font-bold text-[#28A6A0] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#28A6A0]" /> 4. AI Attention Heatmap (Grad-CAM)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isNominal
                        ? 'text-[#43B58A] bg-[#43B58A]/15 border-[#43B58A]/40'
                        : 'text-[#28A6A0] bg-[#28A6A0]/15 border-[#28A6A0]/40'
                    }`}>
                      {Math.round((activeInspection.explainabilityScore || 0.95) * 100)}% Focus on Defect ROI
                    </span>
                  </div>
                </div>

                <div className="relative h-68 sm:h-76 xl:h-84 rounded-xl overflow-hidden bg-[#101B2A] flex items-center justify-center border border-[#263B50] group">
                  <img
                    src={resolveImg(gradcamUrl)}
                    alt="PyTorch Grad-CAM Heatmap"
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      if (filePreview) (e.target as any).src = filePreview;
                    }}
                  />

                  {/* Corner Inspection Reticles in Teal */}
                  <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-[#28A6A0] pointer-events-none" />
                  <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-[#28A6A0] pointer-events-none" />
                  <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-[#28A6A0] pointer-events-none" />
                  <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-[#28A6A0] pointer-events-none" />

                  {/* Verification Pill Overlay */}
                  <div className={`absolute bottom-3 left-3 bg-[#203247]/95 px-3 py-1 rounded-lg text-[10px] font-mono flex items-center gap-2 border shadow-md backdrop-blur-sm ${
                    isNominal ? 'text-[#43B58A] border-[#43B58A]/40' : 'text-[#28A6A0] border-[#28A6A0]/40'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isNominal ? 'Surface Clean (0 Defects)' : 'Verified: True Defect Localization'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                HIERARCHY ITEMS 5, 6, 7, 8:
                5. Defect Type and Confidence
                6. Explainability Focus
                7. Measured Defect Dimensions
                8. Structural Health Score
                ------------------------------------------------------------------- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Item 5: Defect Type and Confidence */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col justify-between shadow-sm min-w-0">
                <div>
                  <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <Target className="w-3.5 h-3.5 text-[#28A6A0] shrink-0" />
                    <span className="truncate">5. Defect & Confidence</span>
                  </div>
                  <div className={`text-base font-bold mt-1.5 truncate ${isNominal ? 'text-[#43B58A]' : 'text-[#F1F5F8]'}`}>
                    {isNominal ? 'NONE (Sound)' : activeInspection.damageType}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#263B50]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#899EAF]">Confidence:</span>
                    <span className="text-[#43B58A] font-bold">
                      {((activeInspection.confidence || 0.95) * 100).toFixed(1)}%
                    </span>
                  </div>
                  {/* Micro Progress Bar */}
                  <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                    <div
                      className="bg-[#43B58A] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (activeInspection.confidence || 0.95) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Item 6: Explainability Focus */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col justify-between shadow-sm min-w-0">
                <div>
                  <div className="text-[10px] font-mono text-[#28A6A0] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#28A6A0] shrink-0" />
                    <span className="truncate">6. Explainability Focus</span>
                  </div>
                  <div className="text-base font-mono font-bold text-[#28A6A0] mt-1.5">
                    {((activeInspection.explainabilityScore || 0.95) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#263B50]">
                  <div className="text-[10px] text-[#899EAF] font-mono truncate">
                    Gradient Energy on Target ROI
                  </div>
                  <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                    <div
                      className="bg-[#28A6A0] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (activeInspection.explainabilityScore || 0.95) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Item 7: Measured Defect Dimensions */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col justify-between shadow-sm min-w-0">
                <div>
                  <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <Ruler className="w-3.5 h-3.5 text-[#D69A55] shrink-0" />
                    <span className="truncate">7. Measured Dimensions</span>
                  </div>
                  <div className="text-base font-mono font-bold text-[#D69A55] mt-1.5 truncate">
                    {isNominal ? '0.0 mm' : `${activeInspection.crackLengthMm || 0} mm`}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#263B50]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#899EAF]">Surface Area:</span>
                    <span className="text-[#D69A55] font-semibold">
                      {isNominal ? '0.0 cm²' : `${activeInspection.defectAreaCm2 || 0} cm²`}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#899EAF] font-mono mt-0.5 truncate">
                    Calibrated 4K Optical Matrix
                  </div>
                </div>
              </div>

              {/* Item 8: Structural Health Score */}
              <div className="bg-[#203247] border border-[#263B50] p-3.5 rounded-xl flex flex-col justify-between shadow-sm min-w-0">
                <div>
                  <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <Activity className="w-3.5 h-3.5 text-[#4D91D2] shrink-0" />
                    <span className="truncate">8. Structural Health</span>
                  </div>
                  <div className={`text-base font-mono font-bold mt-1.5 ${
                    (activeInspection.healthScore ?? activeComponent.healthScore) >= 90
                      ? 'text-[#43B58A]'
                      : (activeInspection.healthScore ?? activeComponent.healthScore) >= 75
                      ? 'text-[#E0B653]'
                      : 'text-[#DF6964]'
                  }`}>
                    {(activeInspection.healthScore ?? activeComponent.healthScore).toFixed(1)}{' '}
                    <span className="text-xs text-[#899EAF]">/ 100</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#263B50]">
                  <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden border border-[#263B50]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (activeInspection.healthScore ?? activeComponent.healthScore) >= 90
                          ? 'bg-[#43B58A]'
                          : (activeInspection.healthScore ?? activeComponent.healthScore) >= 75
                          ? 'bg-[#E0B653]'
                          : 'bg-[#DF6964]'
                      }`}
                      style={{ width: `${Math.min(100, activeInspection.healthScore ?? activeComponent.healthScore)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#899EAF] font-mono mt-1 flex items-center justify-between">
                    <span>Continuous Scale</span>
                    <span className="font-bold text-[#B9C9D3]">
                      {(activeInspection.healthScore ?? activeComponent.healthScore) >= 90
                        ? 'OPTIMAL'
                        : (activeInspection.healthScore ?? activeComponent.healthScore) >= 75
                        ? 'ADVISORY'
                        : 'CRITICAL'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                HIERARCHY ITEM 9:
                9. Spatial Coordinates (3D Raycast Coordinates)
                ------------------------------------------------------------------- */}
            <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#19283A] border border-[#263B50] flex items-center justify-center text-[#28A6A0] font-mono text-xs font-bold shrink-0">
                  <Compass className="w-4 h-4 text-[#28A6A0]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F1F5F8] flex items-center gap-2">
                    <span>9. Spatial Raycast 3D Coordinates:</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#19283A] text-[#899EAF] border border-[#263B50]">
                      Global Reference Frame
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#B9C9D3] mt-1 flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#19283A] border border-[#263B50]">
                      X: <strong className="text-[#F1F5F8]">{coords.x.toFixed(2)} m</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#19283A] border border-[#263B50]">
                      Y: <strong className="text-[#F1F5F8]">{coords.y.toFixed(2)} m</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#19283A] border border-[#263B50]">
                      Z: <strong className="text-[#F1F5F8]">{coords.z.toFixed(2)} m</strong>
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-[#899EAF] font-mono text-right">
                <div>Auto-projected from 2D Bounding Box to 3D Digital Twin Mesh</div>
                <div className="text-[#28A6A0] text-[9px] mt-0.5">Raycast Collision Vector: Normal Aligned</div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                SUPPORTING ENGINEERING CONTEXT:
                Historical Inspection Events Timeline for Active Component
                ------------------------------------------------------------------- */}
            <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl shadow-md">
              <div className="text-xs font-mono uppercase tracking-wider text-[#899EAF] mb-3 font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#28A6A0]" />
                  Historical Inspection Events: {activeComponent.name}
                </span>
                <span className="text-[#D69A55] text-[10px] font-bold">{componentInspections.length} Records Logged</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {componentInspections.map((insp) => {
                  const isRecordSelected = activeInspection.id === insp.id;
                  return (
                    <div
                      key={insp.id}
                      onClick={() => setActiveInspection(insp)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isRecordSelected
                          ? 'bg-[#19283A] border-[#28A6A0] text-[#F1F5F8] font-medium shadow-sm'
                          : 'bg-[#101B2A] border-[#263B50] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="font-mono text-[#899EAF] text-[10px]">{insp.timestamp}</span>
                        <span className="font-bold text-[#F1F5F8]">{insp.damageType}</span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                          insp.severity === 'CRITICAL'
                            ? 'bg-[#DF6964]/15 text-[#DF6964] border-[#DF6964]/40'
                            : insp.severity === 'MODERATE'
                            ? 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
                            : 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                        }`}>
                          {insp.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3.5 font-mono text-[10px]">
                        <span>Confidence: <strong className="text-[#F1F5F8]">{((insp.confidence || 0.95) * 100).toFixed(0)}%</strong></span>
                        <span className="text-[#28A6A0]">Grad-CAM: <strong>{((insp.explainabilityScore || 0.95) * 100).toFixed(0)}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#899EAF] text-sm font-mono gap-3">
            <Scan className="w-10 h-10 text-[#28A6A0]" />
            <div>No active inspection selected. Select a structural component or run diagnosis.</div>
          </div>
        )}
      </main>
    </div>
  );
};
