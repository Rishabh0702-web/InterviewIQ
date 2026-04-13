import { useRef, useState, useCallback, useEffect } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * Custom hook for real-time posture detection using MediaPipe PoseLandmarker.
 * Calculates posture score from shoulder/spine/head alignment.
 */
export default function usePoseDetection() {
  const landmarkerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postureData, setPostureData] = useState({
    score: 100,
    alert: null,
    isGoodPosture: true,
  });

  // Initialize MediaPipe
  const initialize = useCallback(async () => {
    if (landmarkerRef.current) return;
    setLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      setIsReady(true);
    } catch (err) {
      console.error('Pose detection init error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Calculate posture score from landmark positions.
   * Key landmarks: 11(left shoulder), 12(right shoulder), 0(nose), 7(left ear), 8(right ear)
   */
  const calculatePostureScore = useCallback((landmarks) => {
    if (!landmarks || landmarks.length === 0) return { score: 100, alert: null, isGoodPosture: true };

    const lm = landmarks[0]; // first detected pose
    if (lm.length < 13) return { score: 100, alert: null, isGoodPosture: true };

    // Shoulder alignment (should be roughly level)
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);

    // Head forward position (nose vs shoulder midpoint)
    const nose = lm[0];
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // Head should be above and roughly centered over shoulders
    const headForward = Math.abs(nose.x - shoulderMidX);
    const headHeight = shoulderMidY - nose.y; // positive = head above shoulders

    // Scoring
    let score = 100;
    let alerts = [];

    // Shoulder tilt penalty (>0.05 = noticeable tilt)
    if (shoulderTilt > 0.08) {
      score -= Math.min(30, shoulderTilt * 300);
      alerts.push('Straighten your shoulders!');
    }

    // Head forward penalty
    if (headForward > 0.1) {
      score -= Math.min(20, headForward * 150);
      alerts.push('Center your head over your shoulders');
    }

    // Slouching detection (head too close to shoulders vertically)
    if (headHeight < 0.1) {
      score -= Math.min(30, (0.1 - headHeight) * 300);
      alerts.push('Sit up straight — you\'re slouching!');
    }

    score = Math.max(0, Math.round(score));
    const isGoodPosture = score >= 70;
    const alert = alerts.length > 0 ? alerts[0] : null;

    return { score, alert, isGoodPosture };
  }, []);

  // Start detection loop
  const startDetection = useCallback((videoElement) => {
    if (!landmarkerRef.current || !videoElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const drawingUtils = new DrawingUtils(ctx);

    const detect = () => {
      if (!landmarkerRef.current || videoElement.paused || videoElement.ended) return;

      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      try {
        const results = landmarkerRef.current.detectForVideo(videoElement, performance.now());

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw landmarks
        if (results.landmarks && results.landmarks.length > 0) {
          for (const landmark of results.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: 3,
              color: '#7c3aed',
              fillColor: '#a78bfa',
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
              color: '#7c3aed44',
              lineWidth: 2,
            });
          }

          // Calculate posture score
          const data = calculatePostureScore(results.landmarks);
          setPostureData(data);

          // Log every 5 seconds
          const now = Date.now();
          if (now - lastLogTimeRef.current > 5000) {
            lastLogTimeRef.current = now;
          }
        }
      } catch (e) {
        // Video frame may not be ready yet, skip
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [calculatePostureScore]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
    canvasRef,
    isReady,
    loading,
    postureData,
    initialize,
    startDetection,
    stopDetection,
  };
}
