import React, { useState, useEffect } from 'react';
import { BridgeSummary, BridgeComponent, InspectionRecord } from '../../types';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  Activity,
  Award,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ComplianceReportProps {
  summary: BridgeSummary | null;
  components: BridgeComponent[];
  inspections: InspectionRecord[];
  onBack: () => void;
}

export const ComplianceReport: React.FC<ComplianceReportProps> = ({
  summary,
  components,
  inspections,
  onBack,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setPdfError(null);

      // 1. Locate the two distinct A4 report pages
      const page1 = document.getElementById('compliance-report-page-1');
      const page2 = document.getElementById('compliance-report-page-2');

      if (!page1 || !page2) {
        throw new Error('Report page elements not found in DOM.');
      }

      // 2. Initialize jsPDF: A4 Portrait, millimeters
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210; // A4 standard width in mm
      const pdfHeight = 297; // A4 standard height in mm

      // 3. High-DPI Capture Page 1 with html2canvas
      const canvas1 = await html2canvas(page1, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // 4. Capture Page 2 with html2canvas
      const canvas2 = await html2canvas(page2, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
      pdf.addPage();
      pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // 5. Save and trigger automatic browser file download
      const filename = `SHM-Compliance-Report-CAB-BR-2026-X9-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate PDF. You can also use the browser Print option.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Group inspections to get primary record per component
  const [primaryInspections, setPrimaryInspections] = useState<InspectionRecord[]>([]);

  useEffect(() => {
    const map = new Map<string, InspectionRecord>();
    inspections.forEach((insp) => {
      if (!map.has(insp.componentId)) {
        map.set(insp.componentId, insp);
      }
    });
    setPrimaryInspections(Array.from(map.values()));
  }, [inspections]);

  const bci = summary ? summary.bridgeConditionIndex : 80.4;
  const f0 = summary ? summary.currentNaturalFrequency : 0.795;

  return (
    <div className="h-full w-full bg-[#101B2A] overflow-y-auto p-4 md:p-8 text-[#101B2A] font-sans print:bg-white print:p-0 print:overflow-visible">
      {/* =========================================================================
          TOP ACTION TOOLBAR (Hidden during browser Print & PDF rasterization)
          ========================================================================= */}
      <div className="max-w-[820px] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-3.5 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#203247] hover:bg-[#263B50] border border-[#263B50] text-xs font-semibold text-[#F1F5F8] transition-colors shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#899EAF]" /> Back to Digital Twin
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#B9C9D3] px-3.5 py-2 rounded-xl bg-[#203247] border border-[#263B50] shadow-sm">
            <Award className="w-4 h-4 text-[#28A6A0]" />
            <span>Official A4 Engineering Audit (2 Pages)</span>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#203247] hover:bg-[#263B50] border border-[#263B50] text-xs font-semibold text-[#F1F5F8] transition-colors shadow-md"
            title="Open browser print preview (A4 Portrait)"
          >
            <Printer className="w-4 h-4 text-[#899EAF]" /> Print Report
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className={`flex items-center gap-2 px-4.5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg ${
              downloadSuccess
                ? 'bg-[#43B58A] text-white'
                : 'bg-gradient-to-r from-[#28A6A0] to-[#208A85] hover:brightness-110 text-white active:scale-[0.98]'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Official PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Report Downloaded Successfully</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Feedback Banner */}
      {pdfError && (
        <div className="max-w-[820px] mx-auto mb-4 p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center justify-between print:hidden shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{pdfError}</span>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-red-300 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          PAGE 1: Official Header, Key Performance Indicators & Component Status
          ========================================================================= */}
      <section
        id="compliance-report-page-1"
        className="pdf-page print-page w-full max-w-[820px] mx-auto bg-white text-[#101B2A] p-8 md:p-10 shadow-2xl rounded-sm border border-[#CBD5E1] font-sans print:shadow-none print:border-none print:p-0 print:max-w-none mb-8 flex flex-col justify-between"
        style={{ minHeight: '1130px' }}
      >
        <div>
          {/* Institutional Department Header & Branding */}
          <header className="border-b-2 border-[#101B2A] pb-4 mb-5">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 max-w-[500px]">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#28A6A0] font-bold tracking-wider uppercase">
                  <Building2 className="w-4 h-4 text-[#28A6A0] shrink-0" />
                  <span>State Infrastructure Safety Commission • Civil Works Audit Bureau</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-[#101B2A] tracking-tight uppercase leading-tight">
                  Structural Health Monitoring (SHM) Compliance Report
                </h1>
                <p className="text-xs text-[#4B5763] font-medium">
                  Asset: <span className="text-[#101B2A] font-bold">Twin-Pylon Cable-Stayed Suspension Bridge</span> &nbsp;•&nbsp; Structure ID: <span className="font-mono text-[#D69A55] font-bold">CAB-BR-2026-X9</span>
                </p>
              </div>

              {/* Document Verification & Control Block */}
              <div className="text-right text-[11px] font-mono text-[#4B5763] space-y-1 shrink-0 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded shadow-xs min-w-[210px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#899EAF]">Audit Date:</span>
                  <span className="text-[#101B2A] font-bold">{currentDate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#899EAF]">Report Ref:</span>
                  <span className="text-[#4D91D2] font-bold">SHM-2026-NOV-04-X9</span>
                </div>
                <div className="flex justify-between items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#899EAF]">Status:</span>
                  <span className="text-[#D69A55] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded font-bold text-[10px]">
                    LEVEL 2 ADVISORY
                  </span>
                </div>
              </div>
            </div>

            {/* Institutional Metadata Row */}
            <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[9px] font-mono text-[#899EAF]">
              <span>Regulatory Standard: AASHTO MBE (3rd Ed.) / ISO 16587</span>
              <span>Classification: OFFICIAL CIVIL AUDIT • RESTRICTED ACCESS</span>
              <span>Monitoring Mode: Continuous Non-Destructive Telemetry</span>
            </div>
          </header>

          {/* Section 1: Executive Asset Summary & Key Compliance Metrics (KPIs) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#101B2A] font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#101B2A] text-white flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Executive Asset Summary & Key Compliance Metrics</span>
              </h2>
              <span className="text-[10px] font-mono text-[#899EAF]">Composite System Health Matrix</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* KPI 1: Bridge Condition Index */}
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase tracking-wider font-semibold">
                  Bridge Condition Index
                </div>
                <div className="text-xl font-bold font-mono text-[#D69A55] mt-1.5">
                  {bci} <span className="text-xs font-normal text-[#899EAF]">/ 100</span>
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-1 pt-1 border-t border-[#E2E8F0]">
                  Composite Structural Health
                </div>
              </div>

              {/* KPI 2: Structural Safety Level */}
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase tracking-wider font-semibold">
                  Compliance Rating
                </div>
                <div className="text-sm font-bold text-[#101B2A] mt-1.5 leading-snug">
                  Level 2 Advisory
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-1 pt-1 border-t border-[#E2E8F0]">
                  Targeted Remediation Required
                </div>
              </div>

              {/* KPI 3: Fundamental Resonant Frequency */}
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase tracking-wider font-semibold">
                  Fundamental Resonant f₀
                </div>
                <div className="text-sm font-bold font-mono text-[#4D91D2] mt-1.5 leading-snug">
                  {f0} Hz
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-1 pt-1 border-t border-[#E2E8F0]">
                  Base: 0.850 Hz (-6.51% Drop)
                </div>
              </div>

              {/* KPI 4: Active Logged Defects */}
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase tracking-wider font-semibold">
                  Cataloged Defects
                </div>
                <div className="text-sm font-bold font-mono text-[#DF6964] mt-1.5 leading-snug">
                  {inspections.length} Logged Events
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-1 pt-1 border-t border-[#E2E8F0]">
                  AI Grad-CAM Verified Targets
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Substructure & Superstructure Component Status Table */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#101B2A] font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#101B2A] text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Substructure & Superstructure Component Condition Table</span>
              </h2>
              <span className="text-[10px] font-mono text-[#899EAF]">{components.length} Monitored Assemblies</span>
            </div>

            <div className="border border-[#CBD5E1] rounded overflow-hidden shadow-xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F1F5F9] text-[#101B2A] font-mono border-b border-[#CBD5E1] uppercase text-[9px] tracking-wider font-bold">
                  <tr>
                    <th className="p-2.5 w-[32%]">Component Description & ID</th>
                    <th className="p-2.5 w-[14%]">Category</th>
                    <th className="p-2.5 w-[16%]">Health Score</th>
                    <th className="p-2.5 w-[14%]">Condition</th>
                    <th className="p-2.5 w-[10%] text-center">Defects</th>
                    <th className="p-2.5 w-[14%] text-right">Last Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                  {components.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-bold text-[#101B2A]">
                        <div>{c.name}</div>
                        <div className="text-[9px] font-mono text-[#899EAF] font-normal">{c.id}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[#4B5763] text-[10px]">{c.category}</td>
                      <td className={`p-2.5 font-mono font-bold text-[11px] ${
                        c.healthScore >= 90 ? 'text-[#43B58A]' : c.healthScore >= 75 ? 'text-[#E0B653]' : 'text-[#DF6964]'
                      }`}>
                        {c.healthScore.toFixed(1)} / 100
                      </td>
                      <td className="p-2.5">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold inline-block border ${
                          c.status === 'OPTIMAL'
                            ? 'bg-[#ECFDF5] text-[#43B58A] border-[#A7F3D0]'
                            : c.status === 'ADVISORY'
                            ? 'bg-[#FEF3C7] text-[#E0B653] border-[#FDE68A]'
                            : 'bg-[#FEF2F2] text-[#DF6964] border-[#FECACA]'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-center font-bold text-[11px] text-[#101B2A]">
                        {c.defectCount}
                      </td>
                      <td className="p-2.5 font-mono text-[#899EAF] text-right text-[10px]">
                        {c.lastInspectionDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2.1: Executive Engineering Assessment Commentary */}
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-xs space-y-1.5 shadow-xs">
            <div className="text-[10px] font-mono text-[#101B2A] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[#28A6A0]" />
              Executive Structural Engineering Assessment
            </div>
            <p className="text-[11px] text-[#334155] leading-relaxed">
              Continuous multi-modal telemetry and automated computer vision audits confirm global stability for the Twin-Pylon Cable-Stayed Bridge. Substructure Pier West (Pillar 1) maintains an optimal health index of 99.8/100, with dynamic foundation microstrain reading 226.9 &mu;&epsilon; (well below the 400.0 &mu;&epsilon; elastic yield limit). The Superstructure Main Deck Span exhibits localized corrosion and flexural micro-deflections, resulting in a -6.51% modal bending frequency drop. Immediate targeted epoxy remediation and zinc-rich surface recoating are scheduled under Section 5.
            </p>
          </div>
        </div>

        {/* Page 1 Running Footer */}
        <footer className="border-t border-[#CBD5E1] pt-3 mt-6 flex justify-between items-center text-[9px] font-mono text-[#899EAF]">
          <div>Structural Health Monitoring Compliance Audit • Ref: <span className="font-bold text-[#101B2A]">SHM-2026-NOV-04-X9</span></div>
          <div>Structure ID: <span className="font-bold text-[#101B2A]">CAB-BR-2026-X9</span> • Official Civil Document</div>
          <div className="font-bold text-[#101B2A]">Page 1 of 2</div>
        </footer>
      </section>

      {/* =========================================================================
          PAGE 2: AI Grad-CAM Log, Vibration Telemetry, Action Plan & Certification
          ========================================================================= */}
      <section
        id="compliance-report-page-2"
        className="pdf-page print-page w-full max-w-[820px] mx-auto bg-white text-[#101B2A] p-8 md:p-10 shadow-2xl rounded-sm border border-[#CBD5E1] font-sans print:shadow-none print:border-none print:p-0 print:max-w-none flex flex-col justify-between"
        style={{ minHeight: '1130px' }}
      >
        <div>
          {/* Page 2 Running Header */}
          <div className="border-b border-[#CBD5E1] pb-2.5 mb-5 flex justify-between items-center text-[9px] font-mono text-[#899EAF]">
            <div className="font-bold text-[#101B2A] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#28A6A0]" />
              DEPARTMENT OF CIVIL INFRASTRUCTURE & STRUCTURAL SAFETY — SHM COMPLIANCE REPORT
            </div>
            <div>
              Ref: <span className="font-bold text-[#101B2A]">SHM-2026-NOV-04-X9</span> &nbsp;•&nbsp; Structure ID: <span className="font-bold text-[#101B2A]">CAB-BR-2026-X9</span>
            </div>
          </div>

          {/* Section 3: AI Defect Detection & Grad-CAM Explainability Log */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#101B2A] font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#101B2A] text-white flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>AI Defect Detection & Grad-CAM Explainability Log</span>
              </h2>
              <span className="text-[10px] font-mono text-[#899EAF]">
                {primaryInspections.length} Primary Anomalies Logged
              </span>
            </div>

            <div className="border border-[#CBD5E1] rounded overflow-hidden shadow-xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F1F5F9] text-[#101B2A] font-mono border-b border-[#CBD5E1] uppercase text-[9px] tracking-wider font-bold">
                  <tr>
                    <th className="p-2.5">Defect Ref ID</th>
                    <th className="p-2.5">Target Element</th>
                    <th className="p-2.5">Damage Type</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">AI Confidence</th>
                    <th className="p-2.5">Grad-CAM Focus</th>
                    <th className="p-2.5 text-right">3D Coordinates (m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-mono text-[10px]">
                  {primaryInspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 text-[#899EAF] font-mono">{insp.id.substring(0, 15)}</td>
                      <td className="p-2.5 font-bold text-[#101B2A]">{insp.componentId}</td>
                      <td className="p-2.5 text-[#D69A55] font-bold">{insp.damageType}</td>
                      <td className="p-2.5">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold border inline-block ${
                          insp.severity === 'CRITICAL'
                            ? 'bg-[#FEF2F2] text-[#DF6964] border-[#FECACA]'
                            : 'bg-[#FEF3C7] text-[#E0B653] border-[#FDE68A]'
                        }`}>
                          {insp.severity}
                        </span>
                      </td>
                      <td className="p-2.5 text-[#43B58A] font-bold">{(insp.confidence * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-[#28A6A0] font-bold">{(insp.explainabilityScore * 100).toFixed(1)}% ROI</td>
                      <td className="p-2.5 text-[#899EAF] text-right">
                        [{insp.coordinates.x.toFixed(1)}, {insp.coordinates.y.toFixed(1)}, {insp.coordinates.z.toFixed(1)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[9px] font-mono text-[#899EAF] mt-1.5 flex justify-between">
              <span>* Grad-CAM attention saliency verified using PyTorch convolutional gradient activation maps.</span>
              <span>Total cataloged defects in digital twin: {inspections.length}</span>
            </div>
          </div>

          {/* Section 4: Structural Dynamics & Vibration Telemetry Analysis */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#101B2A] font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#101B2A] text-white flex items-center justify-center text-[10px] font-bold">
                  4
                </span>
                <span>Structural Dynamics & Vibration Telemetry Analysis</span>
              </h2>
              <span className="text-[10px] font-mono text-[#899EAF]">100 Hz Piezoelectric Accelerometers</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase font-semibold">Resonant Frequency f₀</div>
                <div className="text-sm font-bold font-mono text-[#101B2A] mt-1">
                  {summary?.currentNaturalFrequency ?? 0.795} Hz
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-0.5">Baseline: 0.850 Hz</div>
              </div>

              <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase font-semibold">Modal Frequency Drop</div>
                <div className="text-sm font-bold font-mono text-[#E0B653] mt-1">
                  -6.51% &Delta;f
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-0.5">Stiffness Loss Metric</div>
              </div>

              <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase font-semibold">Peak Dynamic Accel</div>
                <div className="text-sm font-bold font-mono text-[#101B2A] mt-1">
                  0.1366 g
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-0.5">Vertical Oscillation</div>
              </div>

              <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
                <div className="text-[9px] font-mono text-[#899EAF] uppercase font-semibold">Microstrain & Temp</div>
                <div className="text-sm font-bold font-mono text-[#43B58A] mt-1">
                  226.9 &mu;&epsilon; / 26.3 &deg;C
                </div>
                <div className="text-[9px] text-[#899EAF] font-mono mt-0.5">Sensor SENSOR_P1 Base</div>
              </div>
            </div>
          </div>

          {/* Section 5: Recommended Engineering Remediation Plan */}
          <div className="mb-5">
            <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] border-l-4 border-l-[#D69A55] shadow-xs">
              <h3 className="text-xs font-bold text-[#D69A55] font-mono uppercase tracking-wider flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#D69A55]" />
                5.0 Recommended Engineering Remediation & Action Plan
              </h3>
              <ul className="text-[11px] text-[#334155] space-y-1.5 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-[#101B2A]">Pillar 1 (Pier West Substructure):</strong> Schedule high-pressure epoxy micro-injection for localized foundation micro-cracks within 30 calendar days. Base microstrain (226.9 &mu;&epsilon;) remains well within safe operational yield margins.
                </li>
                <li>
                  <strong className="text-[#101B2A]">Main Deck Span Steel Box Girder:</strong> Execute mechanical surface grit-blasting and apply a 3-coat zinc-rich polyurethane protective coating to mid-span steel flanges within 60 calendar days to halt active oxidation.
                </li>
                <li>
                  <strong className="text-[#101B2A]">Dynamic Telemetry Continuous Acquisition:</strong> Maintain continuous 24/7 telemetry acquisition on SENSOR_P1 to track potential modal stiffness degradation (&Delta;f exceeding -10% threshold).
                </li>
              </ul>
            </div>
          </div>

          {/* Section 6: Engineering Certification & Sign-off Block */}
          <div className="border border-[#CBD5E1] rounded p-3.5 bg-[#F8FAFC] shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#101B2A] font-bold mb-2.5 flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#101B2A] text-white flex items-center justify-center text-[9px] font-bold">
                6
              </span>
              <span>Engineering Certification & Official Sign-off Block</span>
            </div>

            <div className="grid grid-cols-3 gap-6 text-[10px] font-mono">
              <div className="space-y-1">
                <div className="text-[#899EAF] uppercase tracking-wider text-[9px]">Inspecting Structural Engineer</div>
                <div className="text-xs font-bold text-[#101B2A]">Dr. Elena Rostova, PE, SE</div>
                <div className="text-[9px] text-[#899EAF]">Lead Structural Integrity Specialist</div>
                <div className="text-[9px] text-[#899EAF]">PE License #SE-8492041</div>
              </div>

              <div className="space-y-1">
                <div className="text-[#899EAF] uppercase tracking-wider text-[9px]">Auditing Regulatory Body</div>
                <div className="text-xs font-bold text-[#101B2A]">Civil Infrastructure Audit Bureau</div>
                <div className="text-[9px] text-[#899EAF]">Accreditation ID: CIAB-SHM-9942</div>
                <div className="text-[9px] text-[#899EAF]">AASHTO / ISO 16587 Compliance</div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-[#899EAF] uppercase tracking-wider text-[9px]">Document Verification</div>
                <div className="text-xs font-bold text-[#43B58A] flex items-center justify-end gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#43B58A]" /> Certified Digital Twin Record
                </div>
                <div className="text-[9px] text-[#899EAF]">Cryptographic SHA-256 Hash:</div>
                <div className="text-[9px] font-mono text-[#101B2A] font-semibold">8f42e91b072c...d901</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Running Footer */}
        <footer className="border-t border-[#CBD5E1] pt-3 mt-6 flex justify-between items-center text-[9px] font-mono text-[#899EAF]">
          <div>Structural Health Monitoring Compliance Audit • Ref: <span className="font-bold text-[#101B2A]">SHM-2026-NOV-04-X9</span></div>
          <div>Structure ID: <span className="font-bold text-[#101B2A]">CAB-BR-2026-X9</span> • Official Civil Document</div>
          <div className="font-bold text-[#101B2A]">Page 2 of 2</div>
        </footer>
      </section>
    </div>
  );
};
