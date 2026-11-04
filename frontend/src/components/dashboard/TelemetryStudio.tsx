import React, { useEffect, useState, useRef } from 'react';
import { createTelemetryWebSocket, fetchTelemetrySnapshot } from '../../services/api';
import {
  Activity,
  Radio,
  Thermometer,
  Gauge,
  Zap,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Clock,
  Wifi,
  BarChart2,
  TrendingDown,
  Info,
  Sliders,
  Crosshair,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

export const TelemetryStudio: React.FC = () => {
  const [selectedSensor, setSelectedSensor] = useState<string>('SENSOR_DECK');
  const [telemetry, setTelemetry] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{ time: string; accel: number }>>([]);
  const [fftData, setFftData] = useState<Array<{ freq: string; amplitude: number }>>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initial fetch snapshot
    fetchTelemetrySnapshot(selectedSensor)
      .then((data) => {
        setTelemetry(data);
        updateChartData(data);
      })
      .catch(console.error);

    // WebSocket live stream
    try {
      const ws = createTelemetryWebSocket((packet) => {
        setIsConnected(true);
        if (packet.sensor_id === selectedSensor || !telemetry) {
          setTelemetry(packet);
          updateChartData(packet);
        }
      });
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
    } catch (e) {
      console.error('WebSocket connection error', e);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedSensor]);

  const updateChartData = (packet: any) => {
    if (!packet || !packet.time_series) return;

    // Format time series waveform
    const formattedWaveform = packet.time_series.time.map((t: number, idx: number) => ({
      time: `${t.toFixed(2)}s`,
      accel: packet.time_series.accel_y[idx],
    }));
    setTimeSeriesData(formattedWaveform);

    // Format FFT power spectrum
    if (packet.fft_spectrum) {
      const formattedFft = packet.fft_spectrum.frequencies.map((f: number, idx: number) => ({
        freq: `${f.toFixed(1)}Hz`,
        amplitude: packet.fft_spectrum.amplitudes[idx],
      }));
      setFftData(formattedFft);
    }
  };

  // Custom industrial tooltips
  const WaveformTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-[#203247] border border-[#263B50] p-2.5 rounded-lg shadow-xl font-mono text-xs backdrop-blur-md">
          <div className="text-[10px] text-[#899EAF] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#28A6A0]" /> Time: <span className="text-[#F1F5F8] font-bold">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#28A6A0]" />
            <span className="text-[#B9C9D3]">Y-Accel:</span>
            <span className="text-[#28A6A0] font-bold">{val >= 0 ? `+${val.toFixed(4)}` : val.toFixed(4)} g</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const FftTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-[#203247] border border-[#263B50] p-2.5 rounded-lg shadow-xl font-mono text-xs backdrop-blur-md">
          <div className="text-[10px] text-[#899EAF] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#4D91D2]" /> Frequency: <span className="text-[#F1F5F8] font-bold">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4D91D2]" />
            <span className="text-[#B9C9D3]">Spectral Density:</span>
            <span className="text-[#4D91D2] font-bold">{val.toFixed(4)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isStiffnessDegraded = telemetry && telemetry.frequency_shift_pct < -4.0;
  const isCriticalStiffness = telemetry && telemetry.frequency_shift_pct < -10.0;

  return (
    <div className="flex flex-col h-full w-full bg-[#101B2A] overflow-y-auto p-4 lg:p-6 gap-4 text-[#F1F5F8] font-sans">
      {/* =========================================================================
          1. PROFESSIONAL TELEMETRY PAGE HEADING & LIVE CONNECTION STATUS
          ========================================================================= */}
      <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl shrink-0 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#19283A] border border-[#263B50] flex items-center justify-center text-[#28A6A0] shrink-0 shadow-sm">
            <Radio className="w-5 h-5 text-[#28A6A0]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-sm font-bold text-[#F1F5F8] tracking-tight uppercase font-mono">
                Structural Dynamics & Vibration Telemetry
              </h1>
              {/* Live Connection Status Badge */}
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md border flex items-center gap-2 font-bold ${
                isConnected
                  ? 'bg-[#43B58A]/15 text-[#43B58A] border-[#43B58A]/40'
                  : 'bg-[#E0B653]/15 text-[#E0B653] border-[#E0B653]/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#43B58A] animate-pulse' : 'bg-[#E0B653]'}`} />
                {isConnected ? 'LIVE WEBSOCKET STREAM (10 Hz)' : 'STANDBY • RECONNECTING'}
              </span>
            </div>
            <p className="text-[11px] text-[#899EAF] mt-0.5 font-mono">
              Tri-Axial Dynamic Acceleration (100 Hz Sampling) • Fast Fourier Transform (FFT) Resonant Modal Analysis
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Hardware Specs */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-[#899EAF] self-end md:self-auto bg-[#19283A] px-3 py-1.5 rounded-lg border border-[#263B50] shadow-sm">
          <span className="flex items-center gap-1.5 text-[#28A6A0] font-bold">
            <Activity className="w-3.5 h-3.5 text-[#28A6A0]" /> 100 Hz ADC
          </span>
          <span>•</span>
          <span>Buffer: <strong className="text-[#F1F5F8]">2048 Pts</strong></span>
          <span>•</span>
          <span>Latency: <strong className="text-[#43B58A]">~8 ms</strong></span>
        </div>
      </div>

      {/* =========================================================================
          2. SENSOR LOCATION SELECTOR
          ========================================================================= */}
      <div className="bg-[#203247] border border-[#263B50] p-2.5 rounded-xl shrink-0 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 px-2 text-[10px] font-mono uppercase text-[#899EAF] font-bold tracking-wider shrink-0">
          <Cpu className="w-4 h-4 text-[#28A6A0]" />
          <span>Active Transducer Station:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-3xl">
          {/* Station 1: Pillar 1 Base */}
          <button
            onClick={() => setSelectedSensor('SENSOR_P1')}
            className={`px-3.5 py-2 rounded-lg text-left transition-all border flex items-center justify-between ${
              selectedSensor === 'SENSOR_P1'
                ? 'bg-[#19283A] border-[#28A6A0] text-[#F1F5F8] shadow-md'
                : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-[#28A6A0] font-bold">CH-01: Pier West</div>
              <div className="text-xs font-bold leading-tight mt-0.5 truncate">Pillar 1 Base</div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#203247] text-[#899EAF] border border-[#263B50] ml-2 shrink-0">
              Substructure
            </span>
          </button>

          {/* Station 2: Mid-Span Deck */}
          <button
            onClick={() => setSelectedSensor('SENSOR_DECK')}
            className={`px-3.5 py-2 rounded-lg text-left transition-all border flex items-center justify-between ${
              selectedSensor === 'SENSOR_DECK'
                ? 'bg-[#19283A] border-[#28A6A0] text-[#F1F5F8] shadow-md'
                : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-[#28A6A0] font-bold">CH-02: Main Span</div>
              <div className="text-xs font-bold leading-tight mt-0.5 truncate">Mid-Span Deck</div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#203247] text-[#899EAF] border border-[#263B50] ml-2 shrink-0">
              Superstructure
            </span>
          </button>

          {/* Station 3: Pillar 2 Base */}
          <button
            onClick={() => setSelectedSensor('SENSOR_P2')}
            className={`px-3.5 py-2 rounded-lg text-left transition-all border flex items-center justify-between ${
              selectedSensor === 'SENSOR_P2'
                ? 'bg-[#19283A] border-[#28A6A0] text-[#F1F5F8] shadow-md'
                : 'border-[#263B50] bg-[#101B2A] text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#19283A]'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-[#28A6A0] font-bold">CH-03: Pier East</div>
              <div className="text-xs font-bold leading-tight mt-0.5 truncate">Pillar 2 Base</div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#203247] text-[#899EAF] border border-[#263B50] ml-2 shrink-0">
              Substructure
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. FOUR INDUSTRIAL ENGINEERING KPI CARDS
          ========================================================================= */}
      {telemetry && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {/* Card 1: Fundamental Resonant Frequency */}
          <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col justify-between shadow-md min-w-0">
            <div>
              <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-[#4D91D2]">
                  <Activity className="w-3.5 h-3.5 text-[#4D91D2]" /> Fundamental Resonant f₀
                </span>
                <span className="text-[9px] font-mono text-[#899EAF] px-2 py-0.5 rounded-md bg-[#19283A] border border-[#263B50]">
                  Base: {telemetry.baseline_frequency_hz.toFixed(2)} Hz
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#F1F5F8] mt-2">
                {telemetry.current_frequency_hz.toFixed(3)}{' '}
                <span className="text-sm font-semibold text-[#4D91D2]">Hz</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#263B50]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#899EAF]">
                <span>Primary Bending Mode</span>
                <span className="text-[#4D91D2] font-bold">
                  Δ {(telemetry.current_frequency_hz - telemetry.baseline_frequency_hz).toFixed(3)} Hz
                </span>
              </div>
              {/* Visual Frequency Gauge */}
              <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                <div
                  className="bg-[#4D91D2] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (telemetry.current_frequency_hz / 1.0) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Modal Frequency Drop & Stiffness-Loss Status */}
          <div className={`bg-[#203247] border p-4 rounded-xl flex flex-col justify-between shadow-md min-w-0 ${
            isCriticalStiffness
              ? 'border-[#DF6964]/60'
              : isStiffnessDegraded
              ? 'border-[#E0B653]/60'
              : 'border-[#263B50]'
          }`}>
            <div>
              <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-[#E0B653]">
                  <TrendingDown className="w-3.5 h-3.5 text-[#E0B653]" /> Modal Frequency Drop (Δf)
                </span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  isCriticalStiffness
                    ? 'text-[#DF6964] bg-[#DF6964]/15 border-[#DF6964]/40'
                    : isStiffnessDegraded
                    ? 'text-[#E0B653] bg-[#E0B653]/15 border-[#E0B653]/40'
                    : 'text-[#43B58A] bg-[#43B58A]/15 border-[#43B58A]/40'
                }`}>
                  {isStiffnessDegraded ? 'STIFFNESS LOSS' : 'NOMINAL RIGIDITY'}
                </span>
              </div>
              <div className={`text-2xl font-bold font-mono mt-2 ${
                isCriticalStiffness
                  ? 'text-[#DF6964]'
                  : isStiffnessDegraded
                  ? 'text-[#E0B653]'
                  : 'text-[#43B58A]'
              }`}>
                {telemetry.frequency_shift_pct > 0 ? `+${telemetry.frequency_shift_pct}` : telemetry.frequency_shift_pct}{' '}
                <span className="text-sm font-semibold text-[#899EAF]">%</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#263B50]">
              <div className="text-[10px] text-[#899EAF] font-mono truncate">
                {isStiffnessDegraded
                  ? 'Subsurface structural fatigue & flexural softening'
                  : 'Elastic flexural modulus fully preserved'}
              </div>
              {/* Visual Shift Bar */}
              <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCriticalStiffness ? 'bg-[#DF6964]' : isStiffnessDegraded ? 'bg-[#E0B653]' : 'bg-[#43B58A]'
                  }`}
                  style={{ width: `${Math.min(100, Math.abs(telemetry.frequency_shift_pct) * 7)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Peak Dynamic Acceleration */}
          <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col justify-between shadow-md min-w-0">
            <div>
              <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-[#28A6A0]">
                  <Gauge className="w-3.5 h-3.5 text-[#28A6A0]" /> Peak Acceleration
                </span>
                <span className="text-[9px] font-mono text-[#899EAF] px-2 py-0.5 rounded-md bg-[#19283A] border border-[#263B50]">
                  100 Hz RMS
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#F1F5F8] mt-2">
                {telemetry.peak_acceleration_g.toFixed(4)}{' '}
                <span className="text-sm font-semibold text-[#28A6A0]">g</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#263B50]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#899EAF]">
                <span>Vertical Dynamic Amplitude</span>
                <span className="text-[#28A6A0] font-bold">Max Peak</span>
              </div>
              {/* Dynamic Acceleration Meter */}
              <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                <div
                  className="bg-[#28A6A0] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (telemetry.peak_acceleration_g / 0.25) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Strain & Temperature */}
          <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col justify-between shadow-md min-w-0">
            <div>
              <div className="text-[10px] font-mono text-[#899EAF] uppercase tracking-wider flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-[#D69A55]">
                  <Thermometer className="w-3.5 h-3.5 text-[#D69A55]" /> Strain & Temp
                </span>
                <span className="text-[#D69A55] text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#19283A] border border-[#263B50]">
                  {telemetry.temperature_c.toFixed(1)} °C
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#F1F5F8] mt-2">
                {telemetry.strain_microstrain.toFixed(1)}{' '}
                <span className="text-sm font-semibold text-[#43B58A]">με</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#263B50]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#899EAF]">
                <span>Safe Yield Margin</span>
                <span className="text-[#43B58A] font-bold">400 με Limit</span>
              </div>
              {/* Microstrain Gauge Bar vs 400 με Limit */}
              <div className="w-full bg-[#101B2A] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#263B50]">
                <div
                  className="h-full rounded-full bg-[#43B58A] transition-all duration-300"
                  style={{ width: `${Math.min(100, (telemetry.strain_microstrain / 400) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4 & 5. BALANCED REAL-TIME STREAMING CHARTS
          4. Large Acceleration Time-Series Chart
          5. Large FFT Power Spectrum Chart
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[350px]">
        {/* 4. Large Acceleration Time-Series Chart */}
        <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col shadow-md min-h-[330px]">
          {/* Chart Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#263B50] shrink-0">
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F1F5F8] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#28A6A0]" />
                3-Axis Dynamic Acceleration (Y-Bending Mode)
              </h2>
              <p className="text-[10px] text-[#899EAF] font-mono mt-0.5">
                Live time-series accelerometer stream (100 Hz sampling • 40-sample window)
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#28A6A0] bg-[#19283A] px-2.5 py-1 rounded-md border border-[#263B50] font-bold">
              g vs Time (s)
            </span>
          </div>

          {/* Chart Canvas Area */}
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 12, right: 16, left: -16, bottom: 4 }}>
                <defs>
                  <linearGradient id="accelWaveformGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28A6A0" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#28A6A0" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#263B50" strokeDasharray="3 3" vertical={false} />
                <ReferenceLine y={0} stroke="#30485E" strokeWidth={1} />
                <XAxis
                  dataKey="time"
                  stroke="#30485E"
                  tickLine={false}
                  tick={{ fill: '#899EAF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#30485E"
                  tickLine={false}
                  domain={[-0.2, 0.2]}
                  tick={{ fill: '#899EAF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}g`}
                />
                <Tooltip content={<WaveformTooltip />} />
                <Area
                  type="monotone"
                  dataKey="accel"
                  stroke="#28A6A0"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#accelWaveformGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Large FFT Power Spectrum Chart */}
        <div className="bg-[#203247] border border-[#263B50] p-4 rounded-xl flex flex-col shadow-md min-h-[330px]">
          {/* Chart Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#263B50] shrink-0">
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F1F5F8] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4D91D2]" />
                Fast Fourier Transform (FFT) Power Spectrum
              </h2>
              <p className="text-[10px] text-[#899EAF] font-mono mt-0.5">
                Spectral energy density identifying structural resonant peaks & stiffness degradation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#4D91D2] bg-[#19283A] px-2.5 py-1 rounded-md border border-[#263B50] font-bold">
                Amplitude vs Hz
              </span>
            </div>
          </div>

          {/* Chart Canvas Area */}
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fftData} margin={{ top: 12, right: 16, left: -16, bottom: 4 }}>
                <defs>
                  <linearGradient id="fftSpectrumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4D91D2" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4D91D2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#263B50" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="freq"
                  stroke="#30485E"
                  tickLine={false}
                  tick={{ fill: '#899EAF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#30485E"
                  tickLine={false}
                  tick={{ fill: '#899EAF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip content={<FftTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amplitude"
                  stroke="#4D91D2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fftSpectrumGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM TECHNICAL DIAGNOSTICS & TELEMETRY PROTOCOL STRIP
          ========================================================================= */}
      <div className="bg-[#203247] border border-[#263B50] px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#899EAF] shrink-0 gap-2.5 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[#43B58A] font-bold">
            <Wifi className="w-3.5 h-3.5" /> WebSocket Stream Active
          </span>
          <span>•</span>
          <span>Sampling: <strong className="text-[#28A6A0]">100 Hz</strong></span>
          <span>•</span>
          <span>Nyquist Cutoff: <strong className="text-[#F1F5F8]">50.0 Hz</strong></span>
          <span>•</span>
          <span>FFT Engine: <strong className="text-[#F1F5F8]">Scipy rfft (2048 pts)</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>Stream Latency: <strong className="text-[#43B58A]">&lt; 10 ms</strong></span>
          <span>•</span>
          <span>Packet Loss: <strong className="text-[#43B58A]">0.0%</strong></span>
        </div>
      </div>
    </div>
  );
};
