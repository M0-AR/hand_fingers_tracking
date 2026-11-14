# Python toolkit

The Python demos show the same ideas as the browser lab, using a webcam and the MediaPipe SDK. They are intentionally small and readable: each file adds one concept.

## Setup

Run these commands from the repository root:

```bash
python3 -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Run the scripts from the repository root so the relative paths and imports behave consistently:

```bash
python3 python/basic_tracking.py
```

Press **q** in the video window to quit.

## Learning order

| # | File | Adds |
| --- | --- | --- |
| 1 | `basic_tracking.py` | Webcam loop, 21 landmarks, open/closed classification |
| 2 | `track_landmarks.py` | Select and print individual landmarks |
| 3 | `track_rotation.py` | Wrist rotation and finger joint angles |
| 4 | `full_tracking_demo.py` | Distance, rotation, joint angles, and left/right handedness |
| 5 | `save_annotated_frames.py` | Save annotated frames to `Output Images/` for documentation |

## Bluetooth prototype (optional)

`scan_ble_sensor.py` scans for a compatible WitMotion-style BLE IMU and streams its data through `ble_device.py`. The bridge is experimental, is not required for the webcam demos, and is not a medical-grade communication layer.

```bash
BLE_MAC="AA:BB:CC:DD:EE:FF" python3 python/scan_ble_sensor.py
```

## Notes

- Camera access is managed by OpenCV. If no camera is found, check the device index in the script.
- The scripts are demos, not a package. There is no installable module or console entry point.
- This is a research prototype. It is not a medical device and must not be used for diagnosis or treatment.
- See the root [README](../README.md) for the browser experience, evidence, and limitations.
