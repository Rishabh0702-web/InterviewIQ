import { useRef, useState, useCallback, useEffect } from 'react';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'right', 'so yeah', 'i mean', 'kind of', 'sort of'];

/**
 * Custom hook for real-time speech recognition using Web Speech API.
 * Includes filler word detection, transcript management, and a
 * 3-second-silence "answer complete" callback for the auto-flow loop.
 */
export default function useSpeechRecognition() {
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);          // ref mirror — survives closures
  const onAnswerCompleteRef = useRef(null);       // external callback: (answerText) => void

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [fillerCount, setFillerCount] = useState({});
  const [totalFillers, setTotalFillers] = useState(0);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);

  const currentAnswerRef = useRef('');
  const silenceTimerRef = useRef(null);

  // ─── Filler Detection ────────────────────────────────────────────────────────
  const detectFillers = useCallback((text) => {
    const lowerText = text.toLowerCase();
    const newCounts = {};
    let newTotal = 0;

    FILLER_WORDS.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        newCounts[filler] = (newCounts[filler] || 0) + matches.length;
        newTotal += matches.length;
      }
    });

    if (newTotal > 0) {
      setFillerCount((prev) => {
        const updated = { ...prev };
        Object.keys(newCounts).forEach((key) => {
          updated[key] = (updated[key] || 0) + newCounts[key];
        });
        return updated;
      });
      setTotalFillers((prev) => prev + newTotal);
    }
  }, []);

  // ─── Filler Highlight Util ───────────────────────────────────────────────────
  const highlightFillers = useCallback((text) => {
    if (!text) return text;
    let highlighted = text;
    FILLER_WORDS.forEach((filler) => {
      const regex = new RegExp(`(\\b${filler}\\b)`, 'gi');
      highlighted = highlighted.replace(regex, '{{FILLER:$1}}');
    });
    return highlighted;
  }, []);

  // ─── Flush Answer (silence timeout or manual stop) ──────────────────────────
  const flushAnswer = useCallback(() => {
    const text = currentAnswerRef.current.trim();
    if (text.length > 20) {
      const answer = {
        id: Date.now(),
        text,
        timestamp: Date.now(),
        scored: false,
      };
      setAnswers((prev) => [...prev, answer]);
      currentAnswerRef.current = '';

      // Fire the external auto-flow callback (stops mic, triggers AI)
      if (onAnswerCompleteRef.current) {
        onAnswerCompleteRef.current(answer);
      }
    }
  }, []);

  // ─── Initialize Recognition ─────────────────────────────────────────────────
  const initialize = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome.');
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += resultText + ' ';
        } else {
          interim += resultText;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
        currentAnswerRef.current += final;
        detectFillers(final);

        // Reset silence timer on every new speech chunk
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // 3 seconds of silence → answer is done
          flushAnswer();
        }, 3000);
      }

      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic permissions.');
      }
    };

    recognition.onend = () => {
      // Auto-restart only if still supposed to be listening
      if (isListeningRef.current) {
        try { recognition.start(); } catch (e) { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [detectFillers, flushAnswer]);

  // ─── Start Listening ─────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      const ok = initialize();
      if (!ok) return;
    }
    setError(null);
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started — fine
    }
  }, [initialize]);

  // ─── Stop Listening ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* already stopped */ }
    }
    // Flush any buffered answer on manual stop
    if (currentAnswerRef.current.trim().length > 20) {
      const answer = {
        id: Date.now(),
        text: currentAnswerRef.current.trim(),
        timestamp: Date.now(),
        scored: false,
      };
      setAnswers((prev) => [...prev, answer]);
      currentAnswerRef.current = '';
      if (onAnswerCompleteRef.current) {
        onAnswerCompleteRef.current(answer);
      }
    }
  }, []);

  // ─── Set the auto-flow callback ──────────────────────────────────────────────
  /**
   * Register a callback that fires whenever a complete answer is detected
   * (3 sec silence or manual stop). Used by InterviewMode for the auto-flow.
   * @param {Function|null} fn - (answer: {id, text, ...}) => void
   */
  const setOnAnswerComplete = useCallback((fn) => {
    onAnswerCompleteRef.current = fn;
  }, []);

  // ─── Mark Scored ─────────────────────────────────────────────────────────────
  const markScored = useCallback((answerId, score) => {
    setAnswers((prev) =>
      prev.map((a) => (a.id === answerId ? { ...a, scored: true, score } : a))
    );
  }, []);

  // ─── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFillerCount({});
    setTotalFillers(0);
    setAnswers([]);
    currentAnswerRef.current = '';
    setError(null);
    onAnswerCompleteRef.current = null;
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fillerCount,
    totalFillers,
    error,
    answers,
    startListening,
    stopListening,
    setOnAnswerComplete,   // ← new: register the auto-flow callback
    reset,
    highlightFillers,
    markScored,
    FILLER_WORDS,
  };
}
