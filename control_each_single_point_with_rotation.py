import mediapipe as mp
import cv2
import numpy as np
import math

mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands

cap = cv2.VideoCapture(0)

# Define the landmarks you want to track here
DISTANCE_LANDMARKS = [4, 8]  # Distance between thumb tip and index finger tip
ROTATION_LANDMARKS = [0, 9]  # Rotation from wrist to middle finger base


def get_label(index, hand, results):
    output = None
    for idx, classification in enumerate(results.multi_handedness):
        if classification.classification[0].index == index:
            label = classification.classification[0].label
            score = classification.classification[0].score
            text = '{} {}'.format(label, round(score, 2))

            coords = tuple(np.multiply(
                np.array((hand.landmark[mp_hands.HandLandmark.WRIST].x,
                          hand.landmark[mp_hands.HandLandmark.WRIST].y)),
                [640, 480]).astype(int))

            output = text, coords
    return output


def calculate_distance(landmark1, landmark2):
    return np.sqrt((landmark2.x - landmark1.x) ** 2 + (landmark2.y - landmark1.y) ** 2)


def calculate_angle(landmark1, landmark2):
    return math.degrees(math.atan2(landmark2.y - landmark1.y, landmark2.x - landmark1.x))


def process_landmarks(hand, image):
    h, w, c = image.shape

    # Process distance
    if len(DISTANCE_LANDMARKS) >= 2:
        landmark1 = hand.landmark[DISTANCE_LANDMARKS[0]]
        landmark2 = hand.landmark[DISTANCE_LANDMARKS[1]]

        distance = calculate_distance(landmark1, landmark2)
        pixel_distance = int(distance * w)

        # Display distance on image
        cv2.putText(image, f'Distance {DISTANCE_LANDMARKS[0]}-{DISTANCE_LANDMARKS[1]}: {pixel_distance}px',
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Draw line for distance
        start_point = (int(landmark1.x * w), int(landmark1.y * h))
        end_point = (int(landmark2.x * w), int(landmark2.y * h))
        cv2.line(image, start_point, end_point, (0, 255, 0), 2)

    # Process rotation
    if len(ROTATION_LANDMARKS) >= 2:
        landmark1 = hand.landmark[ROTATION_LANDMARKS[0]]
        landmark2 = hand.landmark[ROTATION_LANDMARKS[1]]

        angle = calculate_angle(landmark1, landmark2)

        # Display angle on image
        cv2.putText(image, f'Angle {ROTATION_LANDMARKS[0]}-{ROTATION_LANDMARKS[1]}: {angle:.2f} degrees',
                    (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Draw line for rotation
        start_point = (int(landmark1.x * w), int(landmark1.y * h))
        end_point = (int(landmark2.x * w), int(landmark2.y * h))
        cv2.line(image, start_point, end_point, (255, 0, 0), 2)  # Blue line for rotation

    # Display all landmark numbers
    for i, lm in enumerate(hand.landmark):
        cx, cy = int(lm.x * w), int(lm.y * h)
        cv2.putText(image, str(i), (cx - 10, cy + 10), cv2.FONT_HERSHEY_SIMPLEX,
                    0.8, (0, 255, 0), 2)

    return image


with mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.5) as hands:
    while cap.isOpened():
        ret, frame = cap.read()

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = cv2.flip(image, 1)

        image.flags.writeable = False
        results = hands.process(image)
        image.flags.writeable = True

        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.multi_hand_landmarks:
            for num, hand in enumerate(results.multi_hand_landmarks):
                mp_drawing.draw_landmarks(image, hand, mp_hands.HAND_CONNECTIONS,
                                          mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=2, circle_radius=4),
                                          mp_drawing.DrawingSpec(color=(250, 44, 250), thickness=2, circle_radius=2))

                image = process_landmarks(hand, image)

        cv2.imshow('Hand Tracking', image)

        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()