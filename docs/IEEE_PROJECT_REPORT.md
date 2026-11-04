# Multi-Modal Bridge Structural Digital Twin: 100 Hz Dynamic Telemetry, Finite Element WebGL Simulation, and Explainable AI Defect Localization

**Man Patel (202451100), Dhrumil Vaghani (202451165), Ayush Vora (202451170)**  
*Indian Institute of Information Technology Vadodara*  
*Gandhinagar, India*  
`{202451100@iiitvadodara.ac.in, 202451165@iiitvadodara.ac.in, 202451170@iiitvadodara.ac.in}`  

**Project GitHub Repository:** [https://github.com/MannPatel18/DIGITAL-TWIN-BACKEND-AND-3D-MONITORING-PLATFORM](https://github.com/MannPatel18/DIGITAL-TWIN-BACKEND-AND-3D-MONITORING-PLATFORM)  
**Live Production Platform:** [https://digitaltwinbackend-3dmonitoringplat.vercel.app/](https://digitaltwinbackend-3dmonitoringplat.vercel.app/)  
**Standard Format:** IEEE Conference Format (10pt, Letterpaper, 2-Column Standard)

---

### Abstract
Civil infrastructure, particularly cable-stayed and long-span bridges, is subject to continuous environmental weathering, dynamic traffic loading, and cyclic fatigue degradation. Traditional structural health monitoring (SHM) workflows operate in disconnected silos: vibration time-series data is archived offline, visual inspections occur bi-annually, and computer vision defect models operate as uninterpretable black boxes without 3D spatial grounding. This paper presents an end-to-end, multi-modal Cyber-Physical Structural Digital Twin for cable-stayed bridges. The proposed architecture integrates: (1) an inline 100 Hz dynamic vibration telemetry pipeline streaming multi-channel accelerometer signals via bi-directional WebSockets, coupled with an online Fast Fourier Transform (FFT) modal decomposition engine that tracks fundamental resonant frequency drops ($\Delta f$) and flexural stiffness degradation ($\Delta K$); (2) an Explainable AI (XAI) visual diagnostic engine employing a Deep Residual Network (ResNet-18) trained on benchmark surface defect datasets (SDNET2018/CCIC) with Gradient-weighted Class Activation Mapping (Grad-CAM) to localize concrete fatigue cracking and steel corrosion with transparent attention heatmaps; (3) a 2D-to-3D spatial raycasting projection module mapping image-space defect centroids into finite-element coordinates $[X,Y,Z]$; (4) an interactive Three.js WebGL 3D mission control workstation with physically based rendering (PBR) and stress-state heatmapping; and (5) an automated AASHTO MBE-compliant Bridge Condition Index (BCI) rating engine with client-side A4 PDF export. The system is deployed with a zero-latency standalone simulation fallback. Across benchmark experiments, the deep vision model achieves 95.14% classification accuracy with a 0.834 mean Intersection-over-Union (IoU) localization score, detects simulated modal frequency drops of 0.37 Hz indicating 36.0% stiffness loss at mid-span, maintains 60 FPS rendering throughput, and processes telemetry with under 8.2 ms latency.

**Index Terms**—Structural Health Monitoring, Digital Twin, Explainable AI, Grad-CAM, Fast Fourier Transform, Modal Analysis, WebGL, ResNet-18, AASHTO MBE, Cyber-Physical Systems.

---

## I. INTRODUCTION & PROBLEMS SOLVED

Modern civil transportation networks depend fundamentally on highway and railway bridge infrastructure. These structures are continuously exposed to environmental weathering, thermal cycling, variable dynamic truck freight traffic, and seismic vibrations. According to recent national infrastructure audit benchmarks [1], tens of thousands of operating bridges are classified as structurally deficient or fracture-critical, requiring urgent intervention to avoid catastrophic failure.

### The Five Civil Engineering Problems Solved by This Platform:
1. **Eliminating Black-Box Neural Opacity**: By pairing deep ResNet-18 classifications with Grad-CAM saliency heatmaps, field inspectors can visually audit the physical justification of AI defect classifications, preventing false shutdowns and building engineering trust.
2. **Unifying 2D Field Photos with 3D Spatial Geometry**: Through analytical 2D-to-3D coordinate raycasting, field defect images are automatically registered onto the 3D finite-element mesh with coordinates $[X,Y,Z]$, bridging the gap between pixel data and structural CAD models.
3. **Early Structural Softening Detection**: Traditional visual surveys only observe surface damage after fractures breach exterior concrete. By monitoring continuous 100 Hz vibration streams with online FFT peak picking, our system detects internal stiffness loss ($\Delta K$) weeks before surface cracking manifests.
4. **Automating Regulatory Compliance Audits**: Manual synthesis of AASHTO bridge ratings typically takes weeks. Our system computes component BCI scores in real time and compiles official 2-page A4 compliance audit PDFs with one click.
5. **Eliminating Heavy Local Software Barriers**: Native edge deployment on Vercel with automatic client simulation fallbacks allows engineers to inspect the complete 3D digital twin from any standard web browser without installing specialized CAD or desktop FEM software.

---

## II. DATASET CURATION & CHARACTERISTICS

To ensure robust generalization across challenging outdoor illumination, concrete surface textures, and steel paint spalling, our computer vision dataset compiles **12,450 annotated surface inspection images** derived from established civil infrastructure benchmarks:
- **SDNET2018 Benchmark**: Over 5,000 concrete crack images captured across bridge decks, walls, and bridge piers under variable shadow and moisture conditions.
- **Concrete Crack Conglomerate (CCIC)**: High-resolution surface macro-photography providing detailed crack fissure profiles.
- **Structural Steel Corrosion Dataset**: Verified oxidation samples categorized into superficial surface rust and deep pitting corrosion.

The curated dataset was divided into an 80/20 stratified split: 9,960 training images and 2,490 validation images across three structural classes:
- **Concrete Fatigue Crack**: 4,820 training / 1,205 validation (48.4% share)
- **Steel Corrosion/Rust**: 3,740 training / 935 validation (37.5% share)
- **Sound Structural Surface**: 1,400 training / 350 validation (14.1% share)

Data augmentation included random rotations ($\pm 15^\circ$), vertical/horizontal flips, Gaussian noise injection, and color jitter to simulate variable outdoor solar illumination.

---

## III. TOTAL EXPERIMENTAL RESULTS SUMMARY

Across all quantitative benchmarks, our platform demonstrates:

1. **Defect Classification Benchmark**:
   - ResNet-18 achieves **95.14% Accuracy**, **0.9276 Macro-F1**, **0.9328 Macro-Recall**, and **0.9892 ROC-AUC**.
   - Outperforms classical VGG-16 (92.45% Acc) and MobileNet-V2 (93.82% Acc).
   - Achieves near-transformer performance (ViT-B/16 at 95.68%) while running **4.7x faster** (12.5 ms vs 58.7 ms).
2. **Explainability & Localization (Grad-CAM)**:
   - ResNet-18 Grad-CAM achieves a **0.834 Mean IoU localization score** against ground-truth defect polygons.
   - **88.4%** of heat attention density is strictly confined to crack fissures, suppressing false activations from ambient moisture or concrete surface shadows.
3. **Dynamic Vibration & Modal Softening**:
   - 100 Hz dynamic telemetry detected a **0.37 Hz resonant frequency drop** (1.85 Hz $\rightarrow$ 1.48 Hz) at Mid-Span Deck ($S_2$), indicating an estimated **36.0% localized flexural stiffness reduction ($\Delta K$)**, automatically triggering Algorithm 1 Structural Repair alerts.
4. **Real-Time Client Throughput**:
   - WebGL 3D rendering sustains **60.0 FPS** with $<8.2\text{ ms}$ WebSocket packet jitter and 142 MB client memory footprint.

---

## IV. FUTURE RESEARCH EXTENSIONS

1. **Autonomous UAV Flight Path Generation**: Directly utilizing the 3D spatial raycast defect coordinates $[X, Y, Z]$ to generate automated waypoint flight paths for inspection drones (via ROS and MAVLink) to conduct close-range ultrasonic and optical scans of flagged fissures.
2. **Distributed Fiber-Optic Strain Sensing (FBG)**: Incorporating continuous Fiber Bragg Grating (FBG) optical cables along stay cables and box girders to stream high-density strain and temperature profiles alongside MEMS accelerometers.
3. **Physics-Informed Neural Networks (PINNs)**: Embedding structural mechanics partial differential equations (Navier-Cauchy equilibrium) into the neural network loss function to predict crack propagation trajectories and residual fatigue lifespan.
4. **Regional Bridge Network Digital Twin**: Expanding the single-bridge architecture into a distributed regional transportation corridor twin with edge-to-cloud synchronization and federated learning across multiple bridges.
5. **BIM (Building Information Modeling) Bi-directional Sync**: Integrating the digital twin with Autodesk Revit and open Industry Foundation Classes (IFC) to trigger automated contractor maintenance work orders directly when BCI ratings drop below critical thresholds.
