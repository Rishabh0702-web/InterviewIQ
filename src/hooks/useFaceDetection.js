import { useRef, useState, useCallback, useEffect } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Custom hook for face/emotion/eye contact detection using MediaPipe FaceLandmarker.
 * Analyzes face landmarks for:
 * - Emotion estimation (mouth shape, brow position)
 * - Eye gaze direction (iris landmarks)
 * - Eye contact percentage
 */
export default function useFaceDetection() {
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const eyeContactLogsRef = useRef([]);
  const lastLogTimeRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faceData, setFaceData] = useState({
    emotion: 'neutral',
    confidence: 75,
    eyeContact: true,
    eyeContactPercentage: 100,
    alert: null,
  });

  // Initialize
  const initialize = useCallback(async () => {
    if (landmarkerRef.current) return;
    setLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      setIsReady(true);
    } catch (err) {
      console.error('Face detection init error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Analyze face blendshapes for emotion and eye gaze.
   */
  const analyzeBlendshapes = useCallback((blendshapes) => {
    if (!blendshapes || blendshapes.length === 0) {
      return { emotion: 'neutral', confidence: 50, eyeContact: true, alert: null };
    }

    const shapes = blendshapes[0].categories;
    const getScore = (name) => {
      const found = shapes.find((s) => s.categoryName === name);
      return found ? found.score : 0;
    };

    // Emotion analysis from blendshapes
    const mouthSmileL = getScore('mouthSmileLeft');
    const mouthSmileR = getScore('mouthSmileRight');
    const browDownL = getScore('browDownLeft');
    const browDownR = getScore('browDownRight');
    const browInnerUp = getScore('browInnerUp');
    const eyeSquintL = getScore('eyeSquintLeft');
    const eyeSquintR = getScore('eyeSquintRight');
    const jawOpen = getScore('jawOpen');
    const mouthFrownL = getScore('mouthFrownLeft');
    const mouthFrownR = getScore('mouthFrownRight');
    const eyeWideL = getScore('eyeWideLeft');
    const eyeWideR = getScore('eyeWideRight');

    const smile = (mouthSmileL + mouthSmileR) / 2;
    const frown = (mouthFrownL + mouthFrownR) / 2;
    const browDown = (browDownL + browDownR) / 2;
    const eyeWide = (eyeWideL + eyeWideR) / 2;
    const eyeSquint = (eyeSquintL + eyeSquintR) / 2;

    // Determine emotion
    let emotion = 'neutral';
    let confidence = 65;

    if (smile > 0.4) {
      emotion = 'happy';
      confidence = Math.min(95, 70 + smile * 40);
    } else if (frown > 0.3 && browDown > 0.3) {
      emotion = 'tense';
      confidence = Math.max(25, 50 - frown * 30);
    } else if (browInnerUp > 0.4 && eyeWide > 0.3) {
      emotion = 'surprised';
      confidence = 55;
    } else if (eyeSquint > 0.4 && browDown > 0.2) {
      emotion = 'focused';
      confidence = 70;
    } else if (browInnerUp > 0.3 && frown > 0.2) {
      emotion = 'nervous';
      confidence = Math.max(30, 50 - browInnerUp * 25);
    } else {
      emotion = 'neutral';
      confidence = 60 + smile * 20;
    }

    // Eye gaze / eye contact analysis
    const eyeLookOutL = getScore('eyeLookOutLeft');
    const eyeLookOutR = getScore('eyeLookOutRight');
    const eyeLookInL = getScore('eyeLookInLeft');
    const eyeLookInR = getScore('eyeLookInRight');
    const eyeLookUpL = getScore('eyeLookUpLeft');
    const eyeLookUpR = getScore('eyeLookUpRight');
    const eyeLookDownL = getScore('eyeLookDownLeft');
    const eyeLookDownR = getScore('eyeLookDownRight');

    const lookAway = Math.max(
      (eyeLookOutL + eyeLookOutR) / 2,
      (eyeLookInL + eyeLookInR) / 2,
      (eyeLookUpL + eyeLookUpR) / 2,
      (eyeLookDownL + eyeLookDownR) / 2
    );

    const eyeContact = lookAway < 0.35;

    // Track eye contact logs
    eyeContactLogsRef.current.push(eyeContact);
    // Keep last 100 entries
    if (eyeContactLogsRef.current.length > 100) {
      eyeContactLogsRef.current = eyeContactLogsRef.current.slice(-100);
    }

    const lookingCount = eyeContactLogsRef.current.filter(Boolean).length;
    const eyeContactPercentage = Math.round((lookingCount / eyeContactLogsRef.current.length) * 100);

    let alert = null;
    if (!eyeContact) {
      alert = 'Look at the camera — maintain eye contact!';
    } else if (emotion === 'nervous') {
      alert = 'Take a deep breath. You\'ve got this! 💪';
    } else if (emotion === 'tense') {
      alert = 'Relax your facial muscles. Try a gentle smile.';
    }

    return { emotion, confidence: Math.round(confidence), eyeContact, eyeContactPercentage, alert };
  }, []);

  // Start detection loop
  const startDetection = useCallback((videoElement) => {
    if (!landmarkerRef.current || !videoElement) return;

    eyeContactLogsRef.current = [];

    const detect = () => {
      if (!landmarkerRef.current || videoElement.paused || videoElement.ended) return;

      try {
        const results = landmarkerRef.current.detectForVideo(videoElement, performance.now());
        const data = analyzeBlendshapes(results.faceBlendshapes);
        setFaceData(data);
      } catch (e) {
        // Frame not ready, skip
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [analyzeBlendshapes]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    eyeContactLogsRef.current = [];
    setFaceData({
      emotion: 'neutral',
      confidence: 75,
      eyeContact: true,
      eyeContactPercentage: 100,
      alert: null,
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopDetection();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [stopDetection]);

  return {
    isReady,
    loading,
    faceData,
    initialize,
    startDetection,
    stopDetection,
    reset,
  };
}
