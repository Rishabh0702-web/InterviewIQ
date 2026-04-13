import { useRef, useState, useCallback, useEffect } from 'react';

export const TTS_VOICES = [
  // --- Male ---
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   gender: 'male',   style: 'Deep & authoritative' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male',   style: 'Confident & crisp' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male',   style: 'Warm & friendly' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    gender: 'male',   style: 'Calm & professional' },
  // --- Female ---
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',  gender: 'female', style: 'Warm & encouraging' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   gender: 'female', style: 'Bright & clear' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi',   gender: 'female', style: 'Sharp & direct' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace',  gender: 'female', style: 'Composed & professional' },
];

export const PERSONA_DEFAULT_VOICE = {
  friendly:   'ErXwobaYiN019PkySvjV',
  technical:  'VR6AewLTigWG4xSOukaG',
  aggressive: 'pNInz6obpgDQGcFmaJgB',
  panel:      'yoZ06aMxZJJ28mfd3POQ',
};

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

export default function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioElement, setCurrentAudioElement] = useState(null);
  const audioRef = useRef(null);
  const onEndCallbackRef = useRef(null);

  // Audio API Refs
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const fallbackAudioRef = useRef(null);
  const onEndRef = useRef(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getApiKey = () => import.meta.env.VITE_ELEVENLABS_API_KEY || '';

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch (_) { }
      sourceNodeRef.current = null;
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.src = '';
      fallbackAudioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    setIsSpeaking(false);
    setIsLoading(false);
    setCurrentAudioElement(null);
    onEndCallbackRef.current = null;
    onEndRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [stop]);

  const speak = useCallback(async (text, voiceId, onEnd = null) => {
    if (!text) return;
    stop();
    onEndRef.current = onEnd;

    // Remove any special markers like STAR labels for TTS reading
    const cleanText = text.replace(/\[[A-Z]+\]/g, '').trim();
    if (!cleanText) {
      onEndRef.current?.();
      return;
    }

    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

    // ── Fallback: browser SpeechSynthesis ────────────────────────────────
    if (!apiKey) {
      const utter = new SpeechSynthesisUtterance(cleanText);
      // slightly faster rate reduces some browser artifacts
      utter.rate = 1.05; 
      utter.pitch = 1.0;
      utter.lang = 'en-US';

      // Pick a better browser voice if available
      const voices = window.speechSynthesis.getVoices();
      const goodVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Siri") || v.name.includes("Samantha"));
      if (goodVoice) utter.voice = goodVoice;

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        onEndRef.current?.();
        onEndRef.current = null;
      };
      utter.onerror = (e) => {
        if (e.error === 'interrupted') return;
        setIsSpeaking(false);
        onEndRef.current?.();
        onEndRef.current = null;
      };
      window.speechSynthesis.speak(utter);
      return;
    }

    // ── ElevenLabs → Web Audio API (distortion free) ───────────────────────
    setIsLoading(true);
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.75, // smooths out crackles
            similarity_boost: 0.85,
            style: 0.0,
            use_speaker_boost: false, 
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail?.message || `ElevenLabs ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      setCurrentAudioElement(audio);

      audio.onplay = () => { setIsLoading(false); setIsSpeaking(true); };
      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentAudioElement(null);
        URL.revokeObjectURL(audioUrl);
        onEndRef.current?.();
        onEndRef.current = null;
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        setCurrentAudioElement(null);
        URL.revokeObjectURL(audioUrl);
        onEndRef.current?.();
        onEndRef.current = null;
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      };

      await audio.play();

    } catch (err) {
      console.error('ElevenLabs TTS error:', err);
      setIsLoading(false);
      setIsSpeaking(false);

      // Final ultimate fallback in case API limit was reached:
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.onend = () => {
        onEndRef.current?.();
        onEndRef.current = null;
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      };
      window.speechSynthesis.speak(utter);
    }
  }, [stop, getAudioCtx]);

  return { speak, stop, isSpeaking, isLoading, currentAudioElement, voices: TTS_VOICES };
}
