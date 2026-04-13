import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Play, Square, Camera, Eye, Activity, Mic, MicOff,
  AlertTriangle, Smile, Meh, Send, MessageSquare, Lightbulb,
  Brain, Shield, ChevronRight, FileText, User, Users, Crosshair, Monitor,
  Volume2, VolumeX
} from 'lucide-react';
import useCamera from '../hooks/useCamera';
import usePoseDetection from '../hooks/usePoseDetection';
import useFaceDetection from '../hooks/useFaceDetection';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { PERSONAS, getPersonaResponse, getWhisperCoachTip } from '../agents/personaAgent';
import { scoreAnswer } from '../agents/answerScorerAgent';
import { scoreWithSTAR, isSTARApplicable } from '../agents/starScorerAgent';
import { saveSession } from '../utils/sessionStorage';
import useAppStore from '../store/useAppStore';
import useTextToSpeech, { TTS_VOICES, PERSONA_DEFAULT_VOICE } from '../hooks/useTextToSpeech';
import AvatarInterviewer from '../components/AvatarInterviewer';
import './InterviewMode.css';

const EMOTION_LABELS = {
  happy: 'Positive Energy', neutral: 'Calm & Composed', focused: 'Deep Focus',
  nervous: 'Needs Relaxation', tense: 'Release Tension', surprised: 'Surprised',
};

const PERSONA_ICONS = {
  friendly: User, technical: Monitor, aggressive: AlertTriangle, panel: Users,
};

function getLevel(score) {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warning';
  return 'bad';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Persona Selector
function PersonaSelector({ onSelect }) {
  const [selected, setSelected] = useState('friendly');
  const [selectedVoice, setSelectedVoice] = useState(PERSONA_DEFAULT_VOICE['friendly']);

  const handlePersonaClick = (personaId) => {
    setSelected(personaId);
    setSelectedVoice(PERSONA_DEFAULT_VOICE[personaId]);
  };

  const maleVoices = TTS_VOICES.filter((v) => v.gender === 'male');
  const femaleVoices = TTS_VOICES.filter((v) => v.gender === 'female');

  return (
    <div className="persona-selector">
      <div className="start-icon"><Video size={36} /></div>
      <h2>Choose Your Interviewer</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 500 }}>
        Each persona simulates a different interview style. Pick one and start practicing.
      </p>

      <div className="persona-grid">
        {Object.values(PERSONAS).map((p) => {
          const Icon = PERSONA_ICONS[p.id] || User;
          return (
            <div
              key={p.id}
              className={`persona-card ${selected === p.id ? 'selected' : ''}`}
              onClick={() => handlePersonaClick(p.id)}
            >
              <div className="persona-icon-box" style={{ color: p.color }}>
                <Icon size={28} />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
            </div>
          );
        })}
      </div>

      {/* Voice Picker */}
      <div className="voice-picker">
        <h4>Choose Interviewer Voice <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: 500 }}>✦ Powered by Groq TTS</span></h4>
        <div className="voice-gender-row">
          <div className="voice-group">
            <span className="voice-group-label">Male</span>
            <div className="voice-options">
              {maleVoices.map((v) => (
                <button
                  key={v.id}
                  className={`voice-btn ${selectedVoice === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedVoice(v.id)}
                >
                  <span className="voice-name">{v.name}</span>
                  <span className="voice-style">{v.style}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="voice-group">
            <span className="voice-group-label">Female</span>
            <div className="voice-options">
              {femaleVoices.map((v) => (
                <button
                  key={v.id}
                  className={`voice-btn ${selectedVoice === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedVoice(v.id)}
                >
                  <span className="voice-name">{v.name}</span>
                  <span className="voice-style">{v.style}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="voice-note">
          Crystal-clear AI voices via <code>VITE_GROQ_API_KEY</code> — already configured ✓
        </p>
      </div>

      <button className="btn btn-success btn-lg" onClick={() => onSelect(selected, selectedVoice)}>
        <Camera size={18} /> Start Mock Interview <ChevronRight size={18} />
      </button>
    </div>
  );
}

// Main Interview Mode
export default function InterviewMode() {
  const navigate = useNavigate();
  const { jdData, questions } = useAppStore();

  const { videoRef, isActive: cameraActive, error: cameraError, startCamera, stopCamera } = useCamera();
  const { canvasRef, isReady: poseReady, postureData, initialize: initPose, startDetection: startPose, stopDetection: stopPose } = usePoseDetection();
  const { isReady: faceReady, faceData, initialize: initFace, startDetection: startFace, stopDetection: stopFace } = useFaceDetection();

  const {
    isListening, transcript, interimTranscript, fillerCount, totalFillers,
    answers, startListening, stopListening, reset: resetSpeech, highlightFillers, markScored, FILLER_WORDS
  } = useSpeechRecognition();

  const [phase, setPhase] = useState('select');
  const [personaId, setPersonaId] = useState('friendly');
  const [timer, setTimer] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [whisperTips, setWhisperTips] = useState([]);
  const [answerScores, setAnswerScores] = useState([]);
  const [starScores, setStarScores] = useState([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [postureLogs, setPostureLogs] = useState([]);
  const [emotionLogs, setEmotionLogs] = useState([]);
  const [voiceMode, setVoiceMode] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState(PERSONA_DEFAULT_VOICE['friendly']);

  const { speak, stop: stopSpeaking, isSpeaking, isLoading: ttsLoading, currentAudioElement } = useTextToSpeech();

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const lastAnswerIdRef = useRef(null);
  const postureLogRef = useRef(null);
  const emotionLogRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (phase === 'active') { timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === 'active') {
      postureLogRef.current = setInterval(() => {
        setPostureLogs((prev) => [...prev, { score: postureData.score, time: Date.now() }]);
      }, 5000);
    } else { clearInterval(postureLogRef.current); }
    return () => clearInterval(postureLogRef.current);
  }, [phase, postureData.score]);

  useEffect(() => {
    if (phase === 'active') {
      emotionLogRef.current = setInterval(() => {
        setEmotionLogs((prev) => [...prev, { emotion: faceData.emotion, confidence: faceData.confidence, time: Date.now() }]);
      }, 3000);
    } else { clearInterval(emotionLogRef.current); }
    return () => clearInterval(emotionLogRef.current);
  }, [phase, faceData.emotion, faceData.confidence]);

  // Auto-score new answers + drive the AI → speak → listen loop
  useEffect(() => {
    const unscoredAnswer = answers.find((a) => !a.scored && a.id !== lastAnswerIdRef.current);
    if (!unscoredAnswer || phase !== 'active') return;
    lastAnswerIdRef.current = unscoredAnswer.id;

    setChatMessages((prev) => [...prev, { role: 'user', content: unscoredAnswer.text }]);
    const lastQuestion = [...chatMessages].reverse().find((m) => m.role === 'interviewer')?.content || '';

    scoreAnswer(unscoredAnswer.text, lastQuestion).then((score) => {
      markScored(unscoredAnswer.id, score);
      setAnswerScores((prev) => [...prev, score]);
    });

    // STAR scoring (runs in parallel, non-blocking)
    scoreWithSTAR(unscoredAnswer.text, lastQuestion).then((starScore) => {
      setStarScores((prev) => [...prev, { answerId: unscoredAnswer.id, question: lastQuestion, ...starScore }]);
    });

    getWhisperCoachTip(unscoredAnswer.text, lastQuestion).then((tip) => {
      setWhisperTips((prev) => [...prev.slice(-3), tip]);
    });

    setIsAITyping(true);
    const history = [...chatMessages, { role: 'user', content: unscoredAnswer.text }]
      .map((m) => ({ role: m.role === 'interviewer' ? 'interviewer' : 'user', content: m.content }));

    getPersonaResponse(personaId, history, { jdData, questions }).then((response) => {
      setChatMessages((prev) => [...prev, { role: 'interviewer', content: response }]);
      setIsAITyping(false);
      if (voiceMode) {
        stopListening();
        speak(response, selectedVoiceId, () => startListening());
      }
    });
  }, [answers, phase]);

  const handleStart = async (selectedPersona, chosenVoiceId) => {
    setPersonaId(selectedPersona);
    setSelectedVoiceId(chosenVoiceId || PERSONA_DEFAULT_VOICE[selectedPersona]);
    setPhase('loading');
    setModelsLoading(true);
    await startCamera();
    await Promise.all([initPose(), initFace()]);
    setModelsLoading(false);
    setTimeout(async () => {
      if (videoRef.current) { startPose(videoRef.current); startFace(videoRef.current); }
      setPhase('active');
      setIsAITyping(true);
      const opening = await getPersonaResponse(selectedPersona, [], { jdData, questions });
      setChatMessages([{ role: 'interviewer', content: opening }]);
      setIsAITyping(false);
      if (voiceMode) {
        speak(opening, chosenVoiceId || PERSONA_DEFAULT_VOICE[selectedPersona], () => startListening());
      } else {
        startListening();
      }
    }, 1000);
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    const lastQ = [...chatMessages].reverse().find((m) => m.role === 'interviewer')?.content || '';
    scoreAnswer(text, lastQ).then((score) => { setAnswerScores((prev) => [...prev, score]); });
    scoreWithSTAR(text, lastQ).then((starScore) => {
      setStarScores((prev) => [...prev, { question: lastQ, ...starScore }]);
    });
    getWhisperCoachTip(text, lastQ).then((tip) => { setWhisperTips((prev) => [...prev.slice(-3), tip]); });
    setIsAITyping(true);
    const history = [...chatMessages, { role: 'user', content: text }]
      .map((m) => ({ role: m.role === 'interviewer' ? 'interviewer' : 'user', content: m.content }));
    getPersonaResponse(personaId, history, { jdData, questions }).then((response) => {
      setChatMessages((prev) => [...prev, { role: 'interviewer', content: response }]);
      setIsAITyping(false);
      if (voiceMode) {
        stopListening();
        speak(response, selectedVoiceId, () => startListening());
      }
    });
  };

  const handleEnd = () => {
    setPhase('ended');
    stopListening(); stopPose(); stopFace(); stopCamera(); stopSpeaking();
    const postureAvg = postureLogs.length > 0
      ? Math.round(postureLogs.reduce((a, b) => a + b.score, 0) / postureLogs.length)
      : postureData.score;
    const emotionSummary = {};
    emotionLogs.forEach((e) => { emotionSummary[e.emotion] = (emotionSummary[e.emotion] || 0) + 1; });
    const sessionData = {
      persona: personaId, duration: timer, postureAvg, emotionSummary,
      eyeContactAvg: faceData.eyeContactPercentage, fillerCount, totalFillers,
      answerScores, starScores, conversationHistory: chatMessages, transcript, postureLogs, emotionLogs,
    };
    saveSession(sessionData);
    useAppStore.setState({ lastSessionData: sessionData });
  };

  // ─── PHASE: Select ────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="interview-mode">
        <div className="interview-header">
          <div>
            <h1>Mock Interview</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Real-time AI interviewer with voice, vision &amp; coaching</p>
          </div>
        </div>
        <PersonaSelector onSelect={handleStart} />
      </div>
    );
  }

  // ─── PHASE: Ended ─────────────────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="interview-mode">
        <div className="interview-start-screen">
          <div className="start-icon" style={{ background: 'var(--gradient-success)' }}><Shield size={36} /></div>
          <h2>Interview Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500 }}>
            Great practice session! Your performance data has been saved. Head to Analytics for your detailed report.
          </p>
          <div className="vision-metrics" style={{ maxWidth: 500, width: '100%' }}>
            <div className="metric-card"><div className="metric-label">Duration</div><div className="metric-value" style={{ color: 'var(--text-primary)' }}>{formatTime(timer)}</div></div>
            <div className="metric-card"><div className="metric-label">Questions</div><div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{chatMessages.filter((m) => m.role === 'interviewer').length}</div></div>
            <div className="metric-card"><div className="metric-label">Filler Words</div><div className={`metric-value ${totalFillers > 5 ? 'bad' : totalFillers > 2 ? 'warning' : 'good'}`}>{totalFillers}</div></div>
            <div className="metric-card"><div className="metric-label">STAR Answers</div><div className="metric-value" style={{ color: 'var(--accent-success)' }}>{starScores.filter((s) => s.isApplicable && s.overallSTAR >= 60).length}/{starScores.filter((s) => s.isApplicable).length}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button className="btn btn-success btn-lg" onClick={() => navigate('/results')}><FileText size={18} /> View Analytics</button>
            <button className="btn btn-secondary btn-lg" onClick={() => {
              setPhase('select'); setTimer(0); setChatMessages([]); setWhisperTips([]);
              setAnswerScores([]); setStarScores([]); resetSpeech(); setPostureLogs([]); setEmotionLogs([]);
            }}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: Loading / Active ──────────────────────────────────────────────
  const postureLevel = getLevel(postureData.score);
  const eyeLevel = getLevel(faceData.eyeContactPercentage);
  const confLevel = getLevel(faceData.confidence);
  const persona = PERSONAS[personaId];
  const selectedVoiceMeta = TTS_VOICES.find((v) => v.id === selectedVoiceId);

  // Derive avatar state from interview state
  const avatarState = isSpeaking
    ? 'speaking'
    : isAITyping || ttsLoading
      ? 'thinking'
      : isListening
        ? 'listening'
        : 'idle';

  const renderTranscript = () => {
    const text = transcript + (interimTranscript ? ` ${interimTranscript}` : '');
    if (!text) return <span style={{ color: 'var(--text-tertiary)' }}>Waiting for you to speak...</span>;
    const parts = [];
    const regex = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
    let match, lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
      parts.push(<span key={match.index} className="filler-highlight">{match[0]}</span>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
    return parts;
  };

  return (
    <div className="interview-mode">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="interview-header">
        <div>
          <h1>Mock Interview — {persona.name}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {ttsLoading
              ? '⏳ Loading voice...'
              : isSpeaking
                ? `🔊 ${selectedVoiceMeta?.name || 'AI'} is speaking...`
                : isListening
                  ? '🎙️ Listening... speak your answer'
                  : isAITyping
                    ? '🤔 AI is thinking...'
                    : 'Processing...'}
            {timer > 1500 && ' — Session nearing 25 min'}
          </p>
        </div>
        <div className="session-controls">
          <button
            className={`btn btn-sm ${voiceMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setVoiceMode((v) => !v); stopSpeaking(); }}
            title={voiceMode ? 'Voice mode ON — click to mute interviewer' : 'Voice mode OFF — click to enable'}
          >
            {voiceMode ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {voiceMode ? 'Voice ON' : 'Voice OFF'}
          </button>
          <button
            className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'} btn-sm`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? 'Mute' : 'Unmute'}
          </button>
          <div className={`session-timer ${phase === 'active' ? 'active' : ''}`}>
            <div className={`timer-dot ${isSpeaking ? 'speaking' : ''}`} />
            {ttsLoading ? 'Loading...' : isSpeaking ? 'Speaking...' : formatTime(timer)}
          </div>
          <button className="btn btn-danger" onClick={handleEnd}><Square size={16} /> End</button>
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="interview-layout">
        {/* Left: Camera + metrics + transcript */}
        <div className="camera-section">
          {/* User's webcam feed — full size (Google Meet main view) */}
          <div className="camera-container">
            {/* Avatar PiP overlay — floats top-right like Google Meet */}
            <AvatarInterviewer
              personaId={personaId}
              state={avatarState}
              audioElement={currentAudioElement}
              size={100}
            />

            <div className="camera-label">You</div>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            {modelsLoading && (
              <div className="loading-overlay">
                <div className="spinner spinner-lg" />
                <p>Loading AI models...</p>
              </div>
            )}
            {ttsLoading && (
              <div className="tts-loading-overlay">
                <div className="spinner spinner-sm" />
                <span>Generating voice...</span>
              </div>
            )}
            {phase === 'active' && postureData.alert && (
              <div className="posture-alert-overlay warning">{postureData.alert}</div>
            )}
            {phase === 'active' && !postureData.alert && faceData.alert && (
              <div className={`posture-alert-overlay ${faceData.eyeContact ? 'info' : 'warning'}`}>{faceData.alert}</div>
            )}
            {isListening && (
              <div className="mic-live-badge">
                <span className="mic-live-dot" /> Listening
              </div>
            )}
            <div className={`filler-badge ${totalFillers === 0 ? 'clean' : ''}`}>
              {totalFillers === 0 ? 'No fillers' : `${totalFillers} filler${totalFillers > 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="vision-metrics">
            <div className="metric-card">
              <div className="metric-label">Posture</div>
              <div className={`metric-value ${postureLevel}`}>{postureData.score}%</div>
              <div className="metric-bar"><div className={`metric-bar-fill ${postureLevel}`} style={{ width: `${postureData.score}%` }} /></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Eye Contact</div>
              <div className={`metric-value ${eyeLevel}`}>{faceData.eyeContactPercentage}%</div>
              <div className="metric-bar"><div className={`metric-bar-fill ${eyeLevel}`} style={{ width: `${faceData.eyeContactPercentage}%` }} /></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Confidence</div>
              <div className={`metric-value ${confLevel}`}>{faceData.confidence}%</div>
              <div className="metric-bar"><div className={`metric-bar-fill ${confLevel}`} style={{ width: `${faceData.confidence}%` }} /></div>
            </div>
          </div>

          <div className="transcript-panel">
            <h4><FileText size={14} /> Live Transcript</h4>
            <div className="transcript-text">{renderTranscript()}</div>
          </div>
        </div>

        {/* Right: Chat + emotion + whisper */}
        <div className="side-panel">
          <div className="conversation-panel">
            <h4><MessageSquare size={14} /> Interview</h4>
            <div className="chat-messages">
              {chatMessages.map((msg, i) => {
                const userAnswerIdx = chatMessages.slice(0, i + 1).filter((m) => m.role === 'user').length - 1;
                const star = msg.role === 'user' ? starScores[userAnswerIdx] : null;
                return (
                  <div key={i} className={`chat-msg ${msg.role === 'interviewer' ? 'interviewer' : 'user'}`}>
                    <span className="msg-role">{msg.role === 'interviewer' ? persona.name : 'You'}</span>
                    {msg.content}
                    {msg.role === 'user' && answerScores[Math.floor(i / 2)] && (() => {
                      const s = answerScores[Math.floor(i / 2)];
                      const level = s.overall >= 7 ? 'good' : s.overall >= 5 ? 'medium' : 'low';
                      return <div className={`answer-score-bubble ${level}`}>{s.overall.toFixed(1)}/10 — {s.quickTip}</div>;
                    })()}
                    {star && star.isApplicable && (
                      <div className="star-badge">
                        <span className="star-badge-label">STAR</span>
                        {['situation', 'task', 'action', 'result'].map((key) => (
                          <span
                            key={key}
                            className={`star-dot ${star[key]?.present ? 'present' : 'missing'}`}
                            title={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${star[key]?.present ? `${star[key]?.score}/10` : 'Missing'}`}
                          >
                            {key.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {star.tip && <span className="star-tip">{star.tip}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {isAITyping && (
                <div className="chat-msg interviewer typing">
                  <span className="msg-role">{persona.name}</span>
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="text-input-bar">
              <input
                placeholder="Type your answer..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSendText} disabled={!textInput.trim()}>
                <Send size={14} />
              </button>
            </div>
          </div>

          <div className="emotion-panel">
            <h4>Emotion</h4>
            <div className="emotion-display">
              <div className="emotion-icon-box"><Smile size={22} /></div>
              <div className="emotion-info">
                <div className="emotion-name">{faceData.emotion}</div>
                <div className="emotion-desc">{EMOTION_LABELS[faceData.emotion] || 'Analyzing...'}</div>
              </div>
            </div>
          </div>

          {whisperTips.length > 0 && (
            <div className="whisper-panel">
              <h4><Lightbulb size={14} /> Whisper Coach</h4>
              {whisperTips.slice(-2).map((tip, i) => <div key={i} className="whisper-tip">{tip}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
