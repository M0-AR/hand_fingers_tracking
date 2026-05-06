import cv2
import mediapipe as mp
import numpy as np
import math

# Initialize MediaPipe Hands
mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands


# Function to calculate distance between two points
def calculate_distance(p1, p2):
    return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)


# Function to recognize gestures
def recognize_gesture(hand_landmarks):
    # Example gesture: Open hand (large distance between thumb tip and pinky tip)
    thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
    pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]

    distance = calculate_distance(thumb_tip, pinky_tip)

    if distance > 0.3:  # This threshold may need adjustment
        return "OPEN"
    else:
        return "CLOSED"


# Placeholder functions for circuit control
def control_circuit_1(action):
    print(f"Circuit 1: {action}")


def control_circuit_2(action):
    print(f"Circuit 2: {action}")


# Initialize the webcam
cap = cv2.VideoCapture(0)

with mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.5) as hands:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            continue

        # Convert the BGR image to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Flip the image horizontally for a later selfie-view display
        image = cv2.flip(image, 1)

        # To improve performance, optionally mark the image as not writeable to
        # pass by reference.
        image.flags.writeable = False

        # Process the image and detect hands
        results = hands.process(image)

        # Draw the hand annotations on the image
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw landmarks
                mp_drawing.draw_landmarks(
                    image, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=2, circle_radius=4),
                    mp_drawing.DrawingSpec(color=(250, 44, 250), thickness=2, circle_radius=2)
                )

                # Recognize gesture
                gesture = recognize_gesture(hand_landmarks)

                # Control circuits based on gesture
                if gesture == "OPEN":
                    control_circuit_1("ON")
                    control_circuit_2("OFF")
                elif gesture == "CLOSED":
                    control_circuit_1("OFF")
                    control_circuit_2("ON")

                # Display gesture on image
                cv2.putText(image, f"Gesture: {gesture}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Display the image
        cv2.imshow('Hand Tracking', image)

        # Break the loop when 'q' is pressed
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()