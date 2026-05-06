# VisionIoT: Gesture Intelligence & BLE Telemetry Fusion

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-green.svg)](https://mediapipe.dev/)
[![BLE-Bleak](https://img.shields.io/badge/IoT-Bleak-orange.svg)](https://github.com/hbldh/bleak)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Strategic Vision: The Future of Human-Computer Interaction
VisionIoT is a high-performance framework designed at the intersection of **Computer Vision (CV)** and **Internet of Things (IoT)**. It bridges the gap between AI-driven gesture recognition and real-time hardware telemetry, enabling a new generation of touchless Human-Computer Interaction (HCI).

This repository represents an evolutionary journey from simple computer vision tutorials to a sophisticated, production-ready hardware abstraction layer.

---

## 💼 Business & Executive Overview
In an era where touchless interfaces are becoming critical, VisionIoT provides the foundational technology for:
*   **Industrial Automation:** Empowering operators to control complex machinery through precise, non-contact hand gestures, increasing safety in hazardous zones.
*   **Healthcare Innovation:** Enabling surgeons and medical staff to navigate diagnostic imaging and patient data without breaking the sterile field.
*   **Consumer Tech & AR/VR:** Providing the low-latency backbone for immersive digital environments where physical movements translate directly to digital actions.
*   **IoT & Telemetry:** Offering high-fidelity monitoring of motion sensors (IMUs) for logistics, performance sports, and predictive maintenance.

---

## 🛠 Core Technical Architecture
The system architecture is modular and built on three primary pillars:
1.  **Vision Engine:** Powered by Google's MediaPipe, providing 21-point 3D hand landmark tracking.
2.  **Asynchronous IoT Stack:** Built on `Bleak` for robust, event-driven Bluetooth Low Energy (BLE) communication.
3.  **Data Processing Layer:** Custom mathematical models utilizing `NumPy` for real-time kinematic analysis and coordinate transformation.

---

## 📐 Technical Deep-Dive: The "Zero to Hero" Engineering Path

### 👁 The Vision Engine (HCI Logic)
The vision pipeline processes 21 specific hand landmarks (0-20). The complexity scales through the repository:
*   **Euclidean Metrics:** Used in early-stage scripts to detect "pinches" by measuring the straight-line distance between the Thumb tip (4) and Index tip (8).
*   **Angular Orientation:** Derived from the vector between the Wrist (0) and Middle MCP (9), allowing the system to understand hand tilt and rotation.
*   **Joint Kinematics:** The advanced scripts calculate internal angles for all finger joints using `np.arctan2`, enabling the detection of subtle "finger curls" and complex sign language-like inputs.

### 📶 The BLE Hardware Protocol (`device_model.py`)
The system interfaces with professional-grade IMU sensors (specifically designed for WitMotion protocols) using a custom binary frame structure:
*   **Header Synchronization:** Every packet begins with the signature `0x55 0x61`.
*   **Payload structure:** 20-byte data packets parsed into 16-bit signed integers.
*   **Telemetry Scaling:**
    *   **Acceleration (g):** `raw / 32768 * 16` (Handling up to ±16g).
    *   **Angular Velocity (°/s):** `raw / 32768 * 2000` (Handling high-speed rotation).
    *   **Euler Angles (°):** `raw / 32768 * 180` (Providing pitch, roll, and yaw).
*   **Command Set:**
    *   **Unlock:** Send `0xff 0xaa 0x69 0x88 0xb5` (Unlocks the device registers).
    *   **Save:** Send `0xff 0xaa 0x00 0x00 0x00` (Persists settings to sensor flash).

---

## 📂 Comprehensive File-by-File Analysis

### 1. `github_example.py`
*   **Role:** The Foundation.
*   **Analysis:** A minimal implementation showing the raw setup of a MediaPipe `Hands` instance. It demonstrates standard BGR to RGB conversion, frame flipping for selfie-view, and basic landmark rendering. Excellent for onboarding new developers.

### 2. `test.py`
*   **Role:** Diagnostic Tool.
*   **Analysis:** An asynchronous scanning script. It utilizes `BleakScanner` to discover all nearby Bluetooth devices but filters specifically for the "WT" (WitMotion) prefix. It validates that the local system's Bluetooth stack is compatible.

### 3. `control_each_single_point.py`
*   **Role:** Interaction Prototype.
*   **Analysis:** Introduces the concept of interaction. It specifically tracks the distance between landmarks 4 and 8. It maps normalized coordinates (0.0 to 1.0) back to pixel space (640x480) for visual feedback.

### 4. `control_each_single_point_with_rotation.py`
*   **Role:** Spatial Awareness.
*   **Analysis:** Extends basic tracking by adding the `ROTATION_LANDMARKS` [0, 9]. It calculates the hand's orientation angle relative to the frame, providing two degrees of freedom (distance + rotation).

### 5. `control_each_single_point_with_rotation_left_right.py`
*   **Role:** The Flagship Vision Controller.
*   **Analysis:** The most advanced CV script in the repo. It handles:
    *   **Handedness Detection:** Labels hands as "Left" or "Right" with a confidence score.
    *   **Mass Joint Analysis:** Loops through `JOINT_LIST` to calculate angles for every knuckle.
    *   **Persistence:** Optionally writes processed frames to the `Output Images` directory with unique UUID filenames.

### 6. `device_model.py`
*   **Role:** Hardware Abstraction Layer (HAL).
*   **Analysis:** A sophisticated class-based model managing the lifecycle of a BLE sensor.
    *   **Asynchronous Heartbeat:** Uses `asyncio` to maintain a non-blocking connection.
    *   **Notification Handling:** Implements a callback buffer (`TempBytes`) to reconstruct fragmented packets.
    *   **Register Mapping:** Encapsulates the complexity of reading and writing to specific hardware registers.

### 7. `main.py` & `orginal.py`
*   **Role:** Application Logic.
*   **Analysis:** These files represent the bridge. They take the output from the `recognize_gesture` function (identifying "OPEN" vs "CLOSED") and trigger placeholder circuit control functions. This is where the business logic of a specific project (e.g., "turn on the light when hand opens") resides.

---

## 💻 Installation & Environment Setup

### Prerequisites
*   Python 3.8 or higher
*   USB/Integrated Camera
*   Bluetooth 4.0+ Adapter

### Step-by-Step Installation
```bash
# 1. Clone the repository
git clone <repository-url>
cd VisionIoT

# 2. Setup Virtual Environment (Recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install Core Dependencies
pip install mediapipe opencv-python numpy bleak asyncio
```

---

## 📖 Operational Usage Guide

### Real-time Vision Tracking
To launch the full visual analysis suite (Landmarks + Angles + Handedness):
```bash
python control_each_single_point_with_rotation_left_right.py
```

### Sensor Telemetry Streaming
To scan and connect to a WitMotion BLE sensor:
```bash
python test.py
# Note: Ensure your sensor is powered on and within range.
```

---

## 🗺 Future Roadmap
- [ ] **Sensor Fusion:** Combining multiple BLE sensors for full-body motion capture.
- [ ] **Deep Learning Integration:** Custom LSTM models to recognize temporal gestures (e.g., waving, swiping).
- [ ] **ROS2 Node:** Packaging the HAL as a Robot Operating System node for robotic arm control.

---
*Authored by Jules - Senior Software Engineer*
