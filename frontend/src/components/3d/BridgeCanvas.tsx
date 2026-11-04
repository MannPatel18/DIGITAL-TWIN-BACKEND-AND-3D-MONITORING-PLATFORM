import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ComponentId, BridgeComponent, InspectionRecord, BridgeSummary } from '../../types';
import { createBridgeMeshGroup, ViewMode } from './bridgeGeometry';
import { createSensorMarkersGroup, createDefectHotspotsGroup } from './markers';
import {
  Eye,
  Layers,
  ShieldCheck,
  Video,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  MapPin,
  Crosshair,
  Compass,
  Radio,
  Sparkles
} from 'lucide-react';

interface BridgeCanvasProps {
  components: BridgeComponent[];
  inspections: InspectionRecord[];
  summary?: BridgeSummary | null;
  selectedComponentId: ComponentId | null;
  onSelectComponent: (id: ComponentId | null) => void;
  onSelectDefect: (record: InspectionRecord) => void;
  onSelectSensor: (sensorId: string) => void;
  activeSensorId?: string | null;
}

// Optimized camera presets for balanced 65–75% viewport composition
const CAMERA_PRESETS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  DEFAULT: { pos: [0, 10, 31], target: [0, 6.5, 0] },
  PILLAR_01: { pos: [-18, 2, 14], target: [-18, -1.5, 0] },
  PILLAR_02: { pos: [18, 2, 14], target: [18, -1.5, 0] },
  DECK_MIDSPAN: { pos: [0, 8, 15], target: [0, 4.0, 0] },
  CABLE_STAY_WEST: { pos: [-18, 16, 22], target: [-18, 12, 0] },
  CABLE_STAY_EAST: { pos: [18, 16, 22], target: [18, 12, 0] },
  ABUTMENT_NORTH: { pos: [-38, 5, 15], target: [-38, 0.5, 0] },
};

export const BridgeCanvas: React.FC<BridgeCanvasProps> = ({
  components,
  inspections,
  summary,
  selectedComponentId,
  onSelectComponent,
  onSelectDefect,
  onSelectSensor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // View Controls
  const [viewMode, setViewMode] = useState<ViewMode>({
    renderMode: 'HEALTH_HEATMAP',
    showSensors: true,
    showDefects: true,
    wireframe: false,
  });

  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState<boolean>(true);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bridgeGroupRef = useRef<THREE.Group | null>(null);

  // Dynamic Camera Interpolation Targets
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_PRESETS.DEFAULT.pos));
  const cameraTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_PRESETS.DEFAULT.target));
  const currentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_PRESETS.DEFAULT.target));

  // Pulse animation handles
  const markersRef = useRef<{
    updateSensors?: (time: number) => void;
    updateDefects?: (time: number) => void;
  }>({});

  // 1. Initialize Scene, Camera, Renderer, and Lighting
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x101B2A, 0.007);

    // Camera: Fov 45, centered on the bridge superstructure
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(...CAMERA_PRESETS.DEFAULT.pos);
    camera.lookAt(...CAMERA_PRESETS.DEFAULT.target);
    cameraRef.current = camera;

    // WebGL Renderer with High-Performance Settings and Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Subtle Civil Engineering Ground Reference Grid in Steel Blue / Navy
    const grid = new THREE.GridHelper(130, 26, 0x4D91D2, 0x203247);
    grid.position.y = -6.45;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.28;
    scene.add(grid);

    // 3. Multi-Source Natural Studio Lighting Setup
    // Base Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x203247, 0.65);
    scene.add(ambientLight);

    // Warm Key Directional Sunlight (Casts defined shadows)
    const keyLight = new THREE.DirectionalLight(0xFFF7EC, 1.9);
    keyLight.position.set(45, 55, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -50;
    keyLight.shadow.camera.right = 50;
    keyLight.shadow.camera.top = 35;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.radius = 2;
    scene.add(keyLight);

    // Cool Sky Fill Light (Provides geometry contrast on shaded structural faces)
    const fillLight = new THREE.DirectionalLight(0x4D91D2, 0.75);
    fillLight.position.set(-40, 30, -25);
    scene.add(fillLight);

    // Back / Rim Light (Rich Teal highlight on tower apex, stay cables, and railings)
    const rimLight = new THREE.DirectionalLight(0x28A6A0, 0.6);
    rimLight.position.set(0, 25, -45);
    scene.add(rimLight);

    // Natural Ground Reflection
    const groundReflection = new THREE.HemisphereLight(0x4D91D2, 0x101B2A, 0.5);
    scene.add(groundReflection);

    // 4. Smooth Mouse Orbit / Drag / Pan Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 34, theta: Math.PI / 2, phi: Math.PI / 2.7 };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        prevMousePos = { x: e.clientX, y: e.clientY };

        spherical.theta -= deltaX * 0.007;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.007));

        if (e.buttons === 1) {
          // Orbit around focal center
          cameraTargetPos.current.x = cameraTargetLookAt.current.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
          cameraTargetPos.current.y = cameraTargetLookAt.current.y + spherical.radius * Math.cos(spherical.phi);
          cameraTargetPos.current.z = cameraTargetLookAt.current.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        } else if (e.buttons === 2) {
          // Pan
          const panSpeed = 0.035;
          const forward = new THREE.Vector3().subVectors(cameraTargetLookAt.current, camera.position).normalize();
          const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

          cameraTargetPos.current.addScaledVector(right, -deltaX * panSpeed);
          cameraTargetLookAt.current.addScaledVector(right, -deltaX * panSpeed);

          cameraTargetPos.current.y += deltaY * panSpeed;
          cameraTargetLookAt.current.y += deltaY * panSpeed;
        }
      } else {
        // Raycast for hover identification
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        if (bridgeGroupRef.current) {
          const intersects = raycaster.intersectObjects(bridgeGroupRef.current.children, true);
          if (intersects.length > 0) {
            let obj: THREE.Object3D | null = intersects[0].object;
            let compId: string | null = null;
            while (obj && obj !== bridgeGroupRef.current) {
              if ((obj as any).componentId) {
                compId = (obj as any).componentId;
                break;
              }
              obj = obj.parent;
            }
            setHoveredComponent(compId);
          } else {
            setHoveredComponent(null);
          }
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(10, Math.min(85, spherical.radius + e.deltaY * 0.03));
      cameraTargetPos.current.x = cameraTargetLookAt.current.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      cameraTargetPos.current.y = cameraTargetLookAt.current.y + spherical.radius * Math.cos(spherical.phi);
      cameraTargetPos.current.z = cameraTargetLookAt.current.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      if (sceneRef.current) {
        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr && curr !== sceneRef.current) {
            if ((curr as any).sensorId) {
              onSelectSensor((curr as any).sensorId);
              return;
            }
            if ((curr as any).inspectionRecord) {
              onSelectDefect((curr as any).inspectionRecord);
              return;
            }
            if ((curr as any).componentId) {
              onSelectComponent((curr as any).componentId);
              return;
            }
            curr = curr.parent;
          }
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);

    // 5. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation
      camera.position.lerp(cameraTargetPos.current, 0.07);
      currentLookAt.current.lerp(cameraTargetLookAt.current, 0.07);
      camera.lookAt(currentLookAt.current);

      // Update pulsing halos
      markersRef.current.updateSensors?.(elapsed);
      markersRef.current.updateDefects?.(elapsed);

      renderer.render(scene, camera);
    };
    animate();

    // 6. Responsive Resizing with ResizeObserver
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (dom.parentElement) dom.parentElement.removeChild(dom);
    };
  }, []);

  // Update Bridge Geometry & Materials
  useEffect(() => {
    if (!sceneRef.current) return;
    if (bridgeGroupRef.current) {
      sceneRef.current.remove(bridgeGroupRef.current);
    }

    const bridge = createBridgeMeshGroup(components, viewMode, hoveredComponent as ComponentId, selectedComponentId);
    sceneRef.current.add(bridge);
    bridgeGroupRef.current = bridge;
  }, [components, viewMode, hoveredComponent, selectedComponentId]);

  // Update Markers (Sensors & Defects)
  useEffect(() => {
    if (!sceneRef.current) return;

    const oldSensors = sceneRef.current.getObjectByName('SensorsGroup');
    if (oldSensors) sceneRef.current.remove(oldSensors);

    const oldDefects = sceneRef.current.getObjectByName('DefectsGroup');
    if (oldDefects) sceneRef.current.remove(oldDefects);

    if (viewMode.showSensors) {
      const sensors = createSensorMarkersGroup(onSelectSensor);
      sceneRef.current.add(sensors.group);
      markersRef.current.updateSensors = sensors.update;
    } else {
      markersRef.current.updateSensors = undefined;
    }

    if (viewMode.showDefects) {
      const defects = createDefectHotspotsGroup(inspections, onSelectDefect);
      sceneRef.current.add(defects.group);
      markersRef.current.updateDefects = defects.update;
    } else {
      markersRef.current.updateDefects = undefined;
    }
  }, [viewMode.showSensors, viewMode.showDefects, inspections]);

  // Focus Camera when selectedComponentId changes
  useEffect(() => {
    if (!selectedComponentId) return;
    const preset = CAMERA_PRESETS[selectedComponentId] || CAMERA_PRESETS.DEFAULT;
    cameraTargetPos.current.set(...preset.pos);
    cameraTargetLookAt.current.set(...preset.target);
  }, [selectedComponentId]);

  const handleResetCamera = () => {
    onSelectComponent(null);
    cameraTargetPos.current.set(...CAMERA_PRESETS.DEFAULT.pos);
    cameraTargetLookAt.current.set(...CAMERA_PRESETS.DEFAULT.target);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 38%, #19283A 0%, #101B2A 68%, #09111D 100%)',
      }}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle Technical Viewport Corner Crosshairs */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#263B50] pointer-events-none" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#263B50] pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#263B50] pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#263B50] pointer-events-none" />

      {/* =========================================================================
          Top Floating Central Command Toolbar
          ========================================================================= */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto z-10 bg-[#203247]/95 border border-[#263B50] px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-xs">
        {/* Group 1: 3D Visualization Modes (Segmented Selector) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#899EAF] font-mono text-[9px] uppercase tracking-wider px-1 font-bold">
            Render:
          </span>

          <button
            onClick={() => setViewMode(v => ({ ...v, renderMode: 'HEALTH_HEATMAP' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all ${
              viewMode.renderMode === 'HEALTH_HEATMAP'
                ? 'bg-[#19283A] text-[#F1F5F8] border border-[#43B58A] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#43B58A]" />
            Health Heatmap
          </button>

          <button
            onClick={() => setViewMode(v => ({ ...v, renderMode: 'REALISTIC' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all ${
              viewMode.renderMode === 'REALISTIC'
                ? 'bg-[#19283A] text-[#F1F5F8] border border-[#28A6A0] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#28A6A0]" />
            PBR Realistic
          </button>

          <button
            onClick={() => setViewMode(v => ({ ...v, renderMode: 'WIREFRAME' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all ${
              viewMode.renderMode === 'WIREFRAME'
                ? 'bg-[#19283A] text-[#F1F5F8] border border-[#4D91D2] shadow-md'
                : 'text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#4D91D2]" />
            FEA Wireframe
          </button>
        </div>

        {/* Separator Divider */}
        <div className="h-5 w-px bg-[#263B50]" />

        {/* Group 2: Layer Overlays (Sensors & Defects) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(v => ({ ...v, showSensors: !v.showSensors }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
              viewMode.showSensors
                ? 'text-[#28A6A0] bg-[#28A6A0]/15 border-[#28A6A0]/60 shadow-sm'
                : 'text-[#899EAF] bg-[#19283A] border-[#263B50] hover:bg-[#263B50]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${viewMode.showSensors ? 'bg-[#28A6A0] animate-pulse' : 'bg-[#899EAF]'}`} />
            Sensors {viewMode.showSensors ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setViewMode(v => ({ ...v, showDefects: !v.showDefects }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
              viewMode.showDefects
                ? 'text-[#DF6964] bg-[#DF6964]/15 border-[#DF6964]/60 shadow-sm'
                : 'text-[#899EAF] bg-[#19283A] border-[#263B50] hover:bg-[#263B50]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${viewMode.showDefects ? 'bg-[#DF6964] animate-pulse' : 'bg-[#899EAF]'}`} />
            Defects {viewMode.showDefects ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Separator Divider */}
        <div className="h-5 w-px bg-[#263B50]" />

        {/* Group 3: Viewpoint Station Focus (Pillar 1, Mid-Span, Pillar 2, Reset) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#899EAF] font-mono text-[9px] uppercase tracking-wider px-1 flex items-center gap-1 font-bold">
            <Video className="w-3 h-3 text-[#D69A55]" /> Focus:
          </span>

          <button
            onClick={() => onSelectComponent('PILLAR_01')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
              selectedComponentId === 'PILLAR_01'
                ? 'bg-[#19283A] text-[#D69A55] border-[#D69A55] shadow-sm'
                : 'border-transparent text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            Pillar 1
          </button>

          <button
            onClick={() => onSelectComponent('DECK_MIDSPAN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
              selectedComponentId === 'DECK_MIDSPAN'
                ? 'bg-[#19283A] text-[#D69A55] border-[#D69A55] shadow-sm'
                : 'border-transparent text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            Mid-Span
          </button>

          <button
            onClick={() => onSelectComponent('PILLAR_02')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
              selectedComponentId === 'PILLAR_02'
                ? 'bg-[#19283A] text-[#D69A55] border-[#D69A55] shadow-sm'
                : 'border-transparent text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50]'
            }`}
          >
            Pillar 2
          </button>

          <div className="h-4 w-px bg-[#263B50] mx-0.5" />

          <button
            onClick={handleResetCamera}
            title="Reset Camera View to Isometric Overview"
            className="p-1.5 rounded-lg text-[#B9C9D3] hover:text-[#F1F5F8] hover:bg-[#263B50] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          Top Left: Compact Engineering Structural Information Panel
          ========================================================================= */}
      <div className="absolute top-4 left-4 z-10 pointer-events-auto">
        <div className="bg-[#203247]/95 border border-[#263B50] rounded-xl shadow-2xl overflow-hidden transition-all duration-200 w-76 backdrop-blur-md">
          {/* Header Bar */}
          <div
            onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
            className="p-3 bg-[#19283A] border-b border-[#263B50] flex items-center justify-between cursor-pointer hover:bg-[#263B50] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#28A6A0]" />
              <span className="text-xs font-bold text-[#F1F5F8] tracking-wide font-mono">
                TELEMETRY HUD
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#203247] text-[#D69A55] border border-[#263B50] font-bold">
                CAB-BR-2026-X9
              </span>
              {showTelemetryHUD ? <ChevronUp className="w-3.5 h-3.5 text-[#899EAF]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#899EAF]" />}
            </div>
          </div>

          {/* Collapsible Content */}
          {showTelemetryHUD && (
            <div className="p-3.5 space-y-2.5 text-xs font-mono">
              {/* BCI Row */}
              <div className="flex justify-between items-center py-1 border-b border-[#263B50]/60">
                <span className="text-[#B9C9D3] text-[10px]">Bridge Condition (BCI):</span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                  (summary?.bridgeConditionIndex ?? 80) >= 90
                    ? 'text-[#43B58A] bg-[#43B58A]/15 border border-[#43B58A]/40'
                    : (summary?.bridgeConditionIndex ?? 80) >= 75
                    ? 'text-[#E0B653] bg-[#E0B653]/15 border border-[#E0B653]/40'
                    : 'text-[#DF6964] bg-[#DF6964]/15 border border-[#DF6964]/40'
                }`}>
                  {summary ? `${summary.bridgeConditionIndex} / 100` : '80.4 / 100'}
                </span>
              </div>

              {/* Resonant Frequency Row */}
              <div className="flex justify-between items-center py-1 border-b border-[#263B50]/60">
                <span className="text-[#B9C9D3] text-[10px]">Resonant Frequency f₀:</span>
                <span className="text-[#4D91D2] font-bold">
                  {summary?.currentNaturalFrequency ?? 0.795} Hz <span className="text-[9px] text-[#E0B653]">(-6.5%)</span>
                </span>
              </div>

              {/* Sensor & Defect Status Row */}
              <div className="flex justify-between items-center py-1 border-b border-[#263B50]/60">
                <span className="text-[#B9C9D3] text-[10px]">Sensor Network:</span>
                <span className="text-[#43B58A] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#43B58A] animate-pulse" /> 3 Online (100 Hz)
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#B9C9D3] text-[10px]">Active Defect Events:</span>
                <span className="text-[#DF6964] font-bold">
                  {inspections.length} Verified
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          Bottom Overlays (Legend, Hover Reticle, Navigation Help)
          ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-10">
        {/* Bottom Left: FEA Color Scale Legend */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {viewMode.renderMode === 'HEALTH_HEATMAP' && (
            <div className="bg-[#203247]/95 border border-[#263B50] p-3.5 rounded-xl shadow-2xl text-[10px] font-mono text-[#B9C9D3] flex flex-col gap-2 w-72 backdrop-blur-md">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-[#899EAF] font-bold">
                <span>FEA Structural Health Index</span>
                <span className="text-[#43B58A]">AASHTO Scale</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-[#DF6964] via-[#D69A55] via-[#E0B653] to-[#43B58A] border border-[#263B50]" />
              <div className="flex justify-between text-[8px] text-[#899EAF] font-mono font-semibold">
                <span className="text-[#DF6964]">&lt;55 Critical</span>
                <span className="text-[#D69A55]">70 Caution</span>
                <span className="text-[#E0B653]">85 Advisory</span>
                <span className="text-[#43B58A]">100 Healthy</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Center: Hover Target Component Display */}
        {hoveredComponent && (
          <div className="pointer-events-auto bg-[#203247]/95 border border-[#28A6A0] px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#28A6A0] animate-ping" />
            <div>
              <div className="text-[9px] text-[#899EAF] font-mono uppercase tracking-wider font-semibold">Inspection Mesh Node</div>
              <div className="text-xs font-bold text-[#F1F5F8] flex items-center gap-2 mt-0.5">
                {components.find(c => c.id === hoveredComponent)?.name || hoveredComponent}
                {(() => {
                  const comp = components.find(c => c.id === hoveredComponent);
                  if (!comp) return null;
                  return (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      comp.healthScore >= 90
                        ? 'text-[#43B58A] bg-[#43B58A]/15 border border-[#43B58A]/40'
                        : comp.healthScore >= 75
                        ? 'text-[#E0B653] bg-[#E0B653]/15 border border-[#E0B653]/40'
                        : 'text-[#DF6964] bg-[#DF6964]/15 border border-[#DF6964]/40'
                    }`}>
                      {comp.healthScore} / 100
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Right: Workstation Navigation Controls Hint */}
        <div className="pointer-events-auto bg-[#203247]/95 border border-[#263B50] px-3.5 py-2 rounded-xl text-[10px] font-mono text-[#B9C9D3] shadow-xl backdrop-blur-md flex items-center gap-2.5">
          <span><strong className="text-[#F1F5F8]">L-DRAG:</strong> Orbit</span>
          <span className="text-[#30485E]">•</span>
          <span><strong className="text-[#F1F5F8]">R-DRAG:</strong> Pan</span>
          <span className="text-[#30485E]">•</span>
          <span><strong className="text-[#F1F5F8]">WHEEL:</strong> Zoom</span>
          <span className="text-[#30485E]">•</span>
          <span><strong className="text-[#28A6A0]">CLICK:</strong> Inspect</span>
        </div>
      </div>
    </div>
  );
};
