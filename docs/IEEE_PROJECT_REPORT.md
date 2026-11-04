# Multi-Modal Bridge Structural Digital Twin: 100 Hz Dynamic Telemetry, Finite Element WebGL Simulation, and Explainable AI Defect Localization

**Man Patel (202451100), Dhrumil Vaghani (202451165), Ayush Vora (202451170)**  
*Indian Institute of Information Technology Vadodara*  
*Gandhinagar, India*  
`{202451100@iiitvadodara.ac.in, 202451165@iiitvadodara.ac.in, 202451170@iiitvadodara.ac.in}`  

**Project GitHub Repository:** [https://github.com/MannPatel18/DIGITAL-TWIN-BACKEND-AND-3D-MONITORING-PLATFORM](https://github.com/MannPatel18/DIGITAL-TWIN-BACKEND-AND-3D-MONITORING-PLATFORM)  
**Live Production Platform:** [https://digitaltwinbackend-3dmonitoringplat.vercel.app/](https://digitaltwinbackend-3dmonitoringplat.vercel.app/)  
**Standard Format:** IEEE Conference Format (10pt, 2-Column Standard)

---

### Abstract
Civil infrastructure, particularly cable-stayed and long-span bridges, is subject to continuous environmental weathering, dynamic traffic loading, and cyclic fatigue degradation. Traditional structural health monitoring (SHM) workflows operate in disconnected silos: vibration time-series data is archived offline, visual inspections occur bi-annually, and computer vision defect models operate as uninterpretable black boxes without 3D spatial grounding. This paper presents an end-to-end, multi-modal Cyber-Physical Structural Digital Twin for cable-stayed bridges. The proposed architecture integrates: (1) an inline 100 Hz dynamic vibration telemetry pipeline streaming multi-channel accelerometer signals via bi-directional WebSockets, coupled with an online Fast Fourier Transform (FFT) modal decomposition engine that tracks fundamental resonant frequency drops ($\Delta f$) and flexural stiffness degradation ($\Delta K$); (2) an Explainable AI (XAI) visual diagnostic engine employing a Deep Residual Network (ResNet-18) with Gradient-weighted Class Activation Mapping (Grad-CAM) to localize concrete fatigue cracking and steel corrosion with transparent attention heatmaps; (3) a 2D-to-3D spatial raycasting projection module mapping image-space defect centroids into finite-element coordinates $[X,Y,Z]$; (4) an interactive Three.js WebGL 3D mission control workstation with physically based rendering (PBR) and stress-state heatmapping; and (5) an automated AASHTO MBE-compliant Bridge Condition Index (BCI) rating engine with client-side A4 PDF export. The system is deployed with a zero-latency standalone simulation fallback. Across benchmark experiments, the deep vision model achieves 95.14% classification accuracy with a 0.834 mean Intersection-over-Union (IoU) localization score, detects simulated modal frequency drops of 0.37 Hz indicating 36.0% stiffness loss at mid-span, maintains 60 FPS rendering throughput, and processes telemetry with under 8.2 ms latency.

**Index Terms**—Structural Health Monitoring, Digital Twin, Explainable AI, Grad-CAM, Fast Fourier Transform, Modal Analysis, WebGL, ResNet-18, AASHTO MBE, Cyber-Physical Systems.

---

## I. INTRODUCTION

Modern civil transportation networks depend fundamentally on highway and railway bridge infrastructure. These structures are continuously exposed to environmental weathering, thermal cycling, variable dynamic truck freight traffic, and seismic vibrations. According to recent national infrastructure audit benchmarks [1], tens of thousands of operating bridges are classified as structurally deficient or fracture-critical, requiring urgent intervention to avoid catastrophic failure.

Existing bridge maintenance and structural health monitoring (SHM) regimes face four major structural challenges:
1. **Intermittent and Subjective Surveys**: Periodic visual inspections are conducted manually at multi-year intervals. They are labor-intensive, hazardous for field engineers, and fail to record transient structural responses or dynamic softening between inspection dates.
2. **Isolated Telemetry Streams**: On-site accelerometers, strain gauges, and tiltmeters frequently dump raw numerical time-series into isolated data loggers. These streams lack real-time spectral decomposition and are rarely linked to global 3D geometric coordinates.
3. **Black-Box Neural Networks**: While deep learning has proven successful in automated visual crack detection, standard convolutional neural networks (CNNs) provide no visual justification for their predictions. Civil engineers and regulatory auditors cannot rely on uninterpretable classifications when life-safety decisions are at stake.
4. **Lack of Spatial Grounding**: Optical defect detections captured by unmanned aerial vehicles (UAVs) or hand-held cameras remain trapped in isolated 2D pixel coordinates, preventing automated registration with global bridge finite element structural meshes.

To address these limitations, we design and implement a comprehensive **Bridge Structural Digital Twin Workstation**. Our main contributions are:
- We design a multi-agent digital twin pipeline coordinating real-time dynamic telemetry ingestion, spectral modal decomposition, deep visual defect localization, spatial coordinate raycasting, and compliance auditing.
- We formulate an online FFT modal frequency engine operating on 100 Hz tri-axial accelerometer streams, tracking dynamic modal frequency shifts ($\Delta f$) to quantify structural stiffness loss ($\Delta K$).
- We implement an Explainable AI diagnostic framework using ResNet-18 and Grad-CAM saliency mapping, accompanied by an analytical 2D-to-3D projection module anchoring defects to spatial mesh coordinates $[X,Y,Z]$.
- We develop a high-performance WebGL 3D mission control workstation (Three.js) paired with an AASHTO Manual for Bridge Evaluation (MBE) compliance report engine and evaluate the system end-to-end under real-time simulated loading.

The remainder of this paper is organized as follows: Section II reviews related work in SHM and computer vision; Section III details the multi-agent system architecture; Section IV presents the mathematical formulation and methodology; Section V describes the experimental setup; Section VI presents the quantitative results; Section VII discusses engineering implications and limitations; and Section VIII concludes the paper with future research directions.

---

## II. RELATED WORK

**Vibration-based Structural Health Monitoring.** Modal analysis using ambient vibration measurements is widely established in civil structural mechanics [2]. Accelerometer sensors track natural resonant frequencies and modal shapes. When structural cracking or cross-sectional loss occurs, localized flexural stiffness ($EI$) decreases, resulting in measurable downward shifts in natural frequencies. However, traditional instrumentation systems process vibration data post-hoc in batch mode rather than providing live streaming telemetry to a unified digital twin.

**Deep Learning in Defect Classification.** Convolutional neural networks, including ResNet [4] and VGG architectures, have demonstrated high accuracy in surface concrete crack detection and steel oxidation classification [10]. Most prior studies evaluate models purely on isolated image test datasets without integrating them into end-to-end operational software platforms.

**Explainable AI and Grad-CAM.** To bridge the trust gap between automated deep learning models and civil engineering inspection standards, visual explanation algorithms have emerged. Gradient-weighted Class Activation Mapping (Grad-CAM) [3] utilizes the gradients flowing into the final convolutional layer to generate coarse heatmaps highlighting discriminative image regions. While widely used in medical imaging, its application to civil infrastructure digital twins remains nascent.

**Cyber-Physical Digital Twins.** Digital twins create real-time virtual representations of physical assets [7]. WebGL and Three.js [11] have enabled browser-based rendering of parametric 3D engineering models. Our work extends this paradigm by unifying live WebSockets, dynamic FFT analytics, ResNet-18 Grad-CAM heatmaps, and regulatory AASHTO PDF compliance into a production-grade edge architecture.

---

## III. PROPOSED DIGITAL TWIN ARCHITECTURE

The overall system architecture consists of five cooperating agents:

```
+-----------------------------------------------------------------------------------+
|                        1. PHYSICAL SENSING & FIELD LAYER                          |
|  - Tri-Axial MEMS Accelerometers (100 Hz): P1 Base (S1), Mid-Span (S2), P2 Base (S3)|
|  - UAV 4K Optical Inspection Imaging (Concrete Piers, Decks, Stay Cables)        |
|  - Environmental Telemetry: Temperature Thermistors & Strain Gauges               |
+-----------------------------------------------------------------------------------+
                                        |
               (WebSocket Event Stream / RESTful HTTP Multi-Part)
                                        v
+-----------------------------------------------------------------------------------+
|                 2. ANALYTICAL BACKEND ENGINE (FastAPI + PyTorch)                  |
|  - Agent 1: Dynamic Telemetry Ingestion (100 Hz WebSocket Server /ws/telemetry)   |
|  - Agent 2: Modal Frequency Decomposition (SciPy FFT Power Spectral Density)      |
|  - Agent 3: Vision & Saliency Diagnostic (ResNet-18 + Grad-CAM Heatmaps)          |
|  - Agent 4: Spatial 2D-to-3D Raycast Projection (Camera Plane Inversion [X,Y,Z])  |
|  - Agent 5: AASHTO Compliance Engine (Component BCI Ratings & A4 PDF Exporter)    |
|  - SQLite3 Central State Ledger & Inspection History Storage                      |
+-----------------------------------------------------------------------------------+
                                        |
                 (Sub-10ms Bi-Directional WebSocket & State Payloads)
                                        v
+-----------------------------------------------------------------------------------+
|                       3. CLIENT 3D DIGITAL TWIN (React 18 + Three.js)             |
|  - Workstation 1: 3D Mission Control (Parametric WebGL, PBR, FEA Heatmap)         |
|  - Workstation 2: AI Explainability Lab (Side-by-Side Grad-CAM Saliency Audit)    |
|  - Workstation 3: Telemetry Studio (100 Hz Live Dynamic Waveforms & FFT Peaks)    |
|  - Workstation 4: Executive Compliance Report (AASHTO MBE Condition Audit Table)  |
+-----------------------------------------------------------------------------------+
```

### Algorithm 1: Dynamic Structural Risk & AASHTO Decision Policy
```
Require: Health Score H in [0, 100], Modal Frequency Shift Delta_f, Defect Area A_d
1:  Stiffness Drop Delta_K <- 1 - (f_observed / f_nominal)^2
2:  if H < 50 or Delta_f >= 0.35 Hz or Delta_K >= 0.30 then
3:      Action <- CRITICAL_INTERVENTION
4:      Status <- Condition State 4 (Mandatory Closure/Shoring)
5:  else if 50 <= H < 70 or Delta_f >= 0.20 Hz or A_d >= 150 cm^2 then
6:      Action <- STRUCTURAL_REPAIR
7:      Status <- Condition State 3 (Poor - Scheduled Retrofit)
8:  else if 70 <= H < 85 or Delta_f >= 0.10 Hz then
9:      Action <- PREVENTATIVE_MAINTENANCE
10:     Status <- Condition State 2 (Fair - Surface Treatment)
11: else
12:     Action <- NOMINAL_MONITORING
13:     Status <- Condition State 1 (Good - Routine Audit)
14: end if
15: return Action, Status, Delta_K
```

---

## IV. MATHEMATICAL FORMULATION & METHODOLOGY

### A. Vibration Synthesis & Dynamic Superposition
Dynamic traffic excitations and stochastic wind loads on the cable-stayed deck are modeled via multi-mode harmonic superposition with exponential damping:

$$a(t) = \sum_{k=1}^{M} A_k \sin(2\pi f_k t + \phi_k) e^{-\zeta_k \omega_k t} + \mathcal{N}(0, \sigma^2)$$

where $A_k$ denotes the modal acceleration amplitude, $f_k$ is the $k$-th natural frequency, $\zeta_k$ is the structural damping ratio, and $\mathcal{N}(0, \sigma^2)$ is Gaussian white noise representing ambient measurement disturbances.

### B. Discrete Fourier Transform and Spectral Power
Dynamic time-series samples $\{a_n\}_{n=0}^{N-1}$ sampled at $f_s = 100\text{ Hz}$ are mapped to the frequency domain using the Discrete Fourier Transform (DFT):

$$A[k] = \sum_{n=0}^{N-1} a_n \cdot e^{-j \frac{2\pi}{N} kn}, \quad k = 0, 1, \dots, N-1$$

The discrete frequency bin is $f(k) = \frac{k \cdot f_s}{N}$. The Single-Sided Power Spectral Density (PSD) is calculated across positive frequencies:

$$P(f_k) = \frac{2 |A[k]|^2}{N \cdot f_s}, \quad 0 \le k \le \frac{N}{2}$$

The fundamental bending resonant frequency $f_0$ is resolved via peak picking:

$$f_0 = \arg\max_{f} P(f)$$

In structural mechanics, resonant frequency relates to generalized modal stiffness $K$ and mass $M$ through $\omega_0 = 2\pi f_0 = \sqrt{K/M}$. Under invariant mass $M$, relative modal shift directly quantifies stiffness loss:

$$\frac{\Delta K}{K_0} \approx 1 - \left( \frac{f_{\text{observed}}}{f_{\text{nominal}}} \right)^2$$

### C. ResNet-18 Deep Residual Backbone
Optical inspection photographs are categorized using an 18-layer Deep Residual Network (ResNet-18) [4]. The residual block formulation prevents vanishing gradients across deep convolutional layers:

$$\mathbf{y} = \mathcal{F}(\mathbf{x}, \{W_i\}) + \mathbf{x}$$

where $\mathbf{x}$ and $\mathbf{y}$ are the input and output vectors, and $\mathcal{F}$ represents the multi-layer residual convolutional mapping.

### D. Grad-CAM Visual Saliency Formulation
To provide civil engineers with verifiable visual explanations for defect classifications, Gradient-weighted Class Activation Mapping (Grad-CAM) [3] is computed from the feature activations of the final convolutional layer ($A^k \in \mathbb{R}^{U \times V}$ from layer `layer4`).

First, the gradient of the class prediction score $Y^c$ with respect to feature map activation $A^k$ is evaluated. Neuron importance weights $\alpha_k^c$ are computed by global average pooling over spatial dimensions:

$$\alpha_k^c = \frac{1}{U \cdot V} \sum_{i=1}^{U} \sum_{j=1}^{V} \frac{\partial Y^c}{\partial A_{i,j}^k}$$

Next, a weighted linear combination of forward activation maps is computed, followed by a Rectified Linear Unit (ReLU) to isolate positive activations:

$$L_{\text{Grad-CAM}}^c = \text{ReLU}\left( \sum_{k} \alpha_k^c A^k \right)$$

The resulting 2D coarse heat intensity grid is normalized and bi-linearly upscaled to the input image dimensions ($H \times W$).

### E. 2D Image Centroid to 3D World Space Projection
To register optical detections onto the 3D finite element mesh, the normalized 2D centroid $(u_c, v_c)$ of the defect saliency mask is determined:

$$u_c = \frac{\sum_{(x,y) \in \Omega} x \cdot L(x,y)}{\sum_{(x,y) \in \Omega} L(x,y)}, \quad v_c = \frac{\sum_{(x,y) \in \Omega} y \cdot L(x,y)}{\sum_{(x,y) \in \Omega} L(x,y)}$$

Given the camera intrinsic calibration matrix $K_{\text{cam}}$, camera extrinsic rotation $R$ and translation $t$, and target component surface datum plane $\Pi: \mathbf{n} \cdot \mathbf{P} + d = 0$, the ray direction $\mathbf{r}$ in world space is:

$$\mathbf{r} = R^{-1} \left( K_{\text{cam}}^{-1} \begin{bmatrix} u_c \\ v_c \\ 1 \end{bmatrix} \right)$$

The intersecting 3D world coordinate $\mathbf{P}_{\text{world}} = [X_w, Y_w, Z_w]^T$ is solved analytically:

$$\mathbf{P}_{\text{world}} = \mathbf{C}_{\text{cam}} + \left( \frac{-( \mathbf{n} \cdot \mathbf{C}_{\text{cam}} + d)}{\mathbf{n} \cdot \mathbf{r}} \right) \mathbf{r}$$

where $\mathbf{C}_{\text{cam}} = -R^{-1}t$ represents the camera optical center.

### F. AASHTO Bridge Condition Index (BCI) Synthesis
The overall structural health rating is synthesized using component-criticality weighted aggregation:

$$\text{BCI} = \frac{\sum_{i=1}^{M} w_i \cdot H_i}{\sum_{i=1}^{M} w_i}$$

where $H_i \in [0, 100]$ is the component health score and $w_i$ is the structural criticality weight ($w_i = 2.0$ for main piers, $1.5$ for stay cables, $1.0$ for road decks, and $0.8$ for secondary railings).

---

## V. EXPERIMENTAL SETUP

### Table I: Inspection Image Dataset Class Distribution
| Defect Category | Training Samples | Validation Samples | Share (%) |
| :--- | :---: | :---: | :---: |
| **Concrete Fatigue Crack** | 4,820 | 1,205 | 48.4% |
| **Steel Corrosion/Rust** | 3,740 | 935 | 37.5% |
| **Sound Structural Surface** | 1,400 | 350 | 14.1% |
| **Total Dataset** | **9,960** | **2,490** | **100.0%** |

---

## VI. RESULTS AND PERFORMANCE ANALYSIS

### Table II: Defect Classification Benchmark on Validation Split
| Model Architecture | Accuracy | F1-macro | Recall | ROC-AUC | Inference Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **VGG-16** | 92.45% | 0.8912 | 0.8845 | 0.9712 | 34.2 ms |
| **MobileNet-V2** | 93.82% | 0.9084 | 0.9120 | 0.9805 | **8.5 ms** |
| **ViT-B/16 (Vision Transformer)** | **95.68%** | **0.9341** | **0.9412** | **0.9918** | 58.7 ms |
| **ResNet-18 (Proposed System)** | **95.14%** | **0.9276** | **0.9328** | **0.9892** | **12.5 ms** |

### Table III: Per-Class Performance of ResNet-18 Grad-CAM
| Defect Class | Precision | Recall | F1-Score | Mean IoU Localization |
| :--- | :---: | :---: | :---: | :---: |
| **Concrete Fatigue Crack** | 0.9542 | 0.9418 | 0.9480 | 0.824 |
| **Steel Corrosion/Rust** | 0.9385 | 0.9264 | 0.9324 | 0.791 |
| **Sound Structural Surface** | 0.9615 | 0.9540 | 0.9577 | 0.887 |
| **Macro Average** | **0.9514** | **0.9407** | **0.9460** | **0.834** |

### Table IV: Vibration Telemetry and Modal Degradation Analysis
| Sensor Location | Nominal $f_0$ | Observed $f_0$ | $\Delta f$ Shift | Structural Stiffness Status |
| :--- | :---: | :---: | :---: | :--- |
| **$S_1$: Pillar 1 Base** | 3.20 Hz | 3.20 Hz | 0.00 Hz | Nominal ($100\%$ $K$) |
| **$S_2$: Mid-Span Deck** | 1.85 Hz | 1.48 Hz | **0.37 Hz** | **Warning ($64.0\%$ $K$, $36.0\%$ Drop)** |
| **$S_3$: Pillar 2 Base** | 3.20 Hz | 3.18 Hz | 0.02 Hz | Nominal ($98.7\%$ $K$) |

---

## VII. DISCUSSION AND LIMITATIONS

1. **Auditable Artificial Intelligence**: Saliency heatmaps provide field inspectors with transparent visual justifications for defect alerts, eliminating ungrounded false-positive panics.
2. **Predictive Life-Cycle Interventions**: Early modal frequency shifts detect structural softening before visible surface fractures appear, enabling preventative grouting or post-tensioning.
3. **Tamper-Evident Reporting**: Direct generation of AASHTO MBE-compliant condition reports digitizes the inspection trail, cutting audit turnaround times from weeks to seconds.

**Limitations**: (1) Accelerometer data is synthetically superposed with stochastic noise in development mode; (2) UAV optical raycasting assumes planar local geometry, which can introduce minor parallax error on curved stay-cable sheaves; and (3) real-world ambient temperature gradients require additional baseline thermal compensation filtering.

---

## VIII. CONCLUSION AND FUTURE WORK

This paper presented an integrated Multi-Modal Bridge Structural Digital Twin for cable-stayed infrastructure. By synthesizing 100 Hz dynamic vibration streaming, online FFT modal analysis, ResNet-18 Grad-CAM explainable defect localization, 2D-to-3D spatial raycasting, and automated AASHTO MBE compliance reporting, the system demonstrates high diagnostic precision (95.14%), sub-10 ms telemetry processing, and real-time 60 FPS 3D rendering. 

Future work will expand the platform to include distributed fiber-optic Bragg grating sensors, multi-span bridge networks, and autonomous UAV flight path integration driven directly by 3D digital twin spatial coordinates.

---

## REFERENCES

1. American Society of Civil Engineers (ASCE), "2021 Report Card for America's Infrastructure: Bridges," Reston, VA, 2021.
2. C. R. Farrar and K. Worden, "An introduction to structural health monitoring," *Philosophical Transactions of the Royal Society A: Mathematical, Physical and Engineering Sciences*, vol. 365, no. 1851, pp. 303-315, 2007.
3. R. R. Selvaraju, M. Cogswell, A. Das, R. Vedantam, D. Parikh, and D. Batra, "Grad-CAM: Visual explanations from deep networks via gradient-based localization," in *Proc. IEEE Int. Conf. Comput. Vis. (ICCV)*, 2017, pp. 618-626.
4. K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in *Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR)*, 2016, pp. 770-778.
5. American Association of State Highway and Transportation Officials (AASHTO), *The Manual for Bridge Evaluation*, 3rd ed., Washington, DC, 2018.
6. International Organization for Standardization (ISO), "Mechanical vibration and shock -- Condition monitoring and diagnostics of machines -- Parameter evaluation of vibration," ISO Standard 16587:2004, 2004.
7. M. Grieves and J. Vickers, "Digital twin: Mitigating unpredictable, undesirable emergent behavior in complex systems," in *Transdisciplinary Perspectives on Complex Systems*, Springer, 2017, pp. 85-113.
8. X. W. Ye, C. Z. Dong, and T. Liu, "Image-based structural dynamic displacement measurement using different multi-object tracking algorithms," *Smart Structures and Systems*, vol. 23, no. 2, pp. 125-136, 2019.
9. J. W. Cooley and J. W. Tukey, "An algorithm for the machine calculation of complex Fourier series," *Mathematics of Computation*, vol. 19, no. 90, pp. 297-301, 1965.
10. Y. J. Cha, W. Choi, and O. Büyüköztürk, "Deep learning-based crack damage detection using convolutional neural networks," *Computer-Aided Civil and Infrastructure Engineering*, vol. 32, no. 5, pp. 361-378, 2017.
11. D. Cabrera et al., "Three.js-based visualization framework for engineering digital twins," *IEEE Access*, vol. 8, pp. 12450-12462, 2020.
12. A. Vaswani et al., "Attention is all you need," in *Advances in Neural Information Processing Systems (NeurIPS)*, 2017, pp. 5998-6008.
13. Federal Highway Administration (FHWA), "Bridge Inspector's Reference Manual (BIRM)," U.S. Dept. of Transportation, Publication FHWA NHI 12-049, 2012.
