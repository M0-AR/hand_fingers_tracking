# SurgicalAir: Sterile Precision & Touchless Surgical Interface

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-green.svg)](https://mediapipe.dev/)
[![Status](https://img.shields.io/badge/Phase-Medical_Alpha-red.svg)]()
[![Precision](https://img.shields.io/badge/Control-Sub__Millimeter-brightgreen.svg)]()

## 🩺 The "Surgical Air" Initiative: Redefining Sterile Control
Born from a direct challenge from leading surgical heads, **SurgicalAir** is a mission-critical framework designed to enable "Surgery in the Air." By eliminating the need for physical contact with equipment, we solve the primary challenge of the modern OR: maintaining a zero-compromise sterile field while interacting with high-fidelity diagnostic and surgical systems.

### 🏥 The Surgeon's Perspective (Business & Clinical Value)
*   **Zero-Contact Interaction:** Navigate CT scans, MRI data, and robotic interfaces without breaking scrub.
*   **Aseptic Integrity:** Reduces the risk of cross-contamination by removing physical peripherals (mice, touchscreens, joysticks).
*   **Ergonomic Command:** Intuitive "natural language" gestures reduce cognitive load during complex procedures.
*   **Precision Tele-Surgery:** Providing the foundation for sub-millimeter virtual instrument control.

---

## 🛠 Architectural Evolution: Moving Beyond Legacy Protocols
While this repository contains legacy Bluetooth (BLE) drivers for initial sensor prototyping, our architectural roadmap explicitly identifies Bluetooth as **outdated and insufficient** for high-stakes medical environments.

### 📡 Communication Roadmap
1.  **Current (Legacy Bridge):** Asynchronous BLE for low-power IMU telemetry.
2.  **Next Phase:** Ultra-low-latency WiFi 6 (Direct Link) and Medical-grade RF protocols to ensure zero-lag response during active surgery.
3.  **Core Interface:** Modular "Protocol Adapters" allow the system to hot-swap between communication layers without affecting the Vision Engine.

---

## 📐 Technical Deep-Dive: The Kinematic Surgical Engine

### 👁 Vision Engine (Spatial AI)
The system leverages a 21-point hand landmark matrix to create a high-fidelity virtual surrogate of the surgeon's hand.
*   **The Virtual Forceps (Euclidean Logic):** Precise pinch-distance calculation between landmarks 4 and 8 allows for granular "grasp and release" mechanics.
*   **Scalpel Orientation (Angular Metrics):** Vector analysis between the Wrist (0) and Middle MCP (9) provides the 3D pitch and roll necessary for orienting virtual cutting tools.
*   **Micro-Curls (Finger Kinematics):** Using `np.arctan2`, the system monitors knuckle flexion across all digits, translating subtle muscle movements into equipment commands.

### ⚙️ Hardware Abstraction Layer (`device_model.py`)
Encapsulates the complexity of binary data parsing from external sensors:
*   **Header Synchronization:** `0x55 0x61` frame alignment.
*   **Telemetry Normalization:** Translates raw 16-bit data into calibrated surgical metrics (g-force, angular velocity, and Euler orientation).
*   **Register Safety:** Includes a gated "Unlock/Save" mechanism to prevent accidental parameter shifts during operations.

---

## 📂 Engineering Catalog: From Zero to Surgical Hero

### 🏁 Level 1: System Onboarding
*   **`github_example.py`**: Basic visual pipeline setup.
*   **`test.py`**: Initial environment diagnostics and protocol scanning.

### 📈 Level 2: Surgical Interaction Models
*   **`control_each_single_point.py`**: Initial "pinch" prototype for object manipulation.
*   **`control_each_single_point_with_rotation.py`**: Spatial awareness testing for tool orientation.
*   **`control_each_single_point_with_rotation_left_right.py`**: **The Flagship Controller.** Advanced multi-joint kinematics, handedness identification, and high-frequency coordinate tracking.

### 🚀 Level 3: Integrated Control
*   **`main.py`** / **`orginal.py`**: The bridge logic connecting "Air Gestures" to actual circuit triggers and medical equipment placeholders.

---

## 💻 Deployment & Technical Setup

### OR Environment Preparation
*   High-speed depth-sensing camera (or standard HD webcam for simulation).
*   High-frequency compute unit (i7/M2 or equivalent for low-latency AI inference).

### Installation
```bash
# Clone the SurgicalAir Core
git clone <repository-url>
cd SurgicalAir

# Provision the Medical Compute Environment
pip install mediapipe opencv-python numpy bleak asyncio
```

---

## 🗺 Future Clinical Roadmap
- [ ] **Haptic Feedback Integration:** Non-contact ultrasonic haptics for "feeling" virtual resistance.
- [ ] **Multi-Surgeon Coordination:** Synchronized tracking for lead and assistant surgeons.
- [ ] **AI-Assisted Error Correction:** Predictive algorithms to smooth tremulous movements during micro-surgery.

---
*Authored by Jules - Senior Systems Engineer*  
*In collaboration with Head Surgical Consultants*
