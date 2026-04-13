import { useRef, useState, useEffect, useMemo } from 'react';
import './AvatarInterviewer.css';

/* ═══════════════════════════════════════════════════════════════════
   PERSONA CONFIGS — real human photos + metadata
   ═══════════════════════════════════════════════════════════════════ */
const AVATAR_CONFIGS = {
  friendly: {
    label: 'Friendly HR',
    photo: '/avatar-friendly.png',
    accentColor: '#1a8a4a',
  },
  technical: {
    label: 'Technical Lead',
    photo: '/avatar-technical.png',
    accentColor: '#378ADD',
  },
  aggressive: {
    label: 'Tough Manager',
    photo: '/avatar-aggressive.png',
    accentColor: '#d42a2a',
  },
  panel: {
    label: 'Panel Interview',
    photo: '/avatar-panel.png',
    accentColor: '#6C5CE7',
  },
};

/* ═══════════════════════════════════════════════════════════════════
   useAudioAnalyser — extracts real-time amplitude for lip-sync
   Returns mouthOpen (0–1) synced to the ElevenLabs voice audio.
   ═══════════════════════════════════════════════════════════════════ */
function useAudioAnalyser(audioElement) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const connectedElementRef = useRef(null);

  useEffect(() => {
    if (!audioElement) {
      setMouthOpen(0);
      return;
    }

    // Don't reconnect if same element
    if (audioElement === connectedElementRef.current && analyserRef.current) {
      return;
    }

    // Create or reuse AudioContext
    if (!contextRef.current) {
      contextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = contextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Create analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;
    analyserRef.current = analyser;

    // Connect: audio → analyser → speakers
    try {
      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      connectedElementRef.current = audioElement;
    } catch (e) {
      // Already connected — skip
    }

    // Run analysis loop
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);
      // Speech frequencies: bins 0–18 ≈ 0Hz–3.1kHz
      const speechBins = dataArray.slice(0, 18);
      const avg = speechBins.reduce((sum, v) => sum + v, 0) / speechBins.length;
      const normalized = Math.min(1, avg / 140);
      const eased = normalized > 0.05 ? Math.pow(normalized, 0.7) : 0;
      setMouthOpen(eased);
      animFrameRef.current = requestAnimationFrame(analyze);
    };
    analyze();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioElement]);

  // Gracefully close mouth when audio ends
  useEffect(() => {
    if (!audioElement) {
      const timer = setTimeout(() => setMouthOpen(0), 100);
      return () => clearTimeout(timer);
    }
  }, [audioElement]);

  return mouthOpen;
}

/* ═══════════════════════════════════════════════════════════════════
   AvatarInterviewer — Google Meet-style floating PiP
   ═══════════════════════════════════════════════════════════════════
   Props:
     personaId    — 'friendly' | 'technical' | 'aggressive' | 'panel'
     state        — 'idle' | 'listening' | 'thinking' | 'speaking'
     audioElement — Audio DOM element from useTextToSpeech (for lip-sync)
     size         — photo diameter in px (default 100)
   ═══════════════════════════════════════════════════════════════════ */
export default function AvatarInterviewer({
  personaId = 'friendly',
  state = 'idle',
  audioElement = null,
  size = 100,
}) {
  const config = AVATAR_CONFIGS[personaId] || AVATAR_CONFIGS.friendly;
  const mouthOpen = useAudioAnalyser(state === 'speaking' ? audioElement : null);

  // Volume bars for speaking state
  const [volumeBars, setVolumeBars] = useState([2, 2, 2, 2]);
  useEffect(() => {
    if (state !== 'speaking') {
      setVolumeBars([2, 2, 2, 2]);
      return;
    }
    const interval = setInterval(() => {
      setVolumeBars(Array.from({ length: 4 }, () =>
        2 + Math.round(Math.random() * (mouthOpen * 10))
      ));
    }, 120);
    return () => clearInterval(interval);
  }, [state, mouthOpen]);

  // State label text
  const stateLabel = useMemo(() => {
    switch (state) {
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking';
      case 'listening': return 'Listening';
      default: return config.label;
    }
  }, [state, config.label]);

  // Photo scale when speaking — subtle "breathing" effect tied to audio
  const speakScale = state === 'speaking' ? 1 + mouthOpen * 0.03 : 1;

  // Mouth overlay height tied to audio amplitude
  const mouthHeight = mouthOpen * 8;

  return (
    <div className={`avatar-pip state-${state}`}>
      {/* Glow ring wrapper */}
      <div className="avatar-ring">
        {/* Photo */}
        <div
          className="avatar-photo-container"
          style={{ width: size, height: size }}
        >
          <img
            className="avatar-photo"
            src={config.photo}
            alt={config.label}
            style={{
              transform: `scale(${speakScale})`,
            }}
            draggable={false}
          />

          {/* Semi-transparent mouth movement overlay — synced with audio */}
          {state === 'speaking' && mouthOpen > 0.05 && (
            <div
              className="avatar-mouth-overlay"
              style={{ height: Math.max(1, mouthHeight) }}
            />
          )}

          {/* Audio ring */}
          <div className="avatar-audio-ring" />
        </div>
      </div>

      {/* Name + status badge */}
      <div className="avatar-info-badge">
        <span className="avatar-status-dot" />
        {stateLabel}

        {/* Speaking: show volume bars inline */}
        {state === 'speaking' && (
          <div className="avatar-volume-indicator">
            {volumeBars.map((h, i) => (
              <div key={i} className="avatar-vol-bar" style={{ height: h }} />
            ))}
          </div>
        )}

        {/* Thinking: show dots inline */}
        {state === 'thinking' && (
          <div className="avatar-thinking-dots">
            <span /><span /><span />
          </div>
        )}
      </div>
    </div>
  );
}
