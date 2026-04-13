import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HistoryIcon, BarChart3, Trash2, RefreshCw, Clock, Activity,
  Eye, Mic, User, Monitor, AlertTriangle, Users, Calendar,
  TrendingUp, Award, ChevronRight, Sparkles
} from 'lucide-react';
import { getSessions, deleteSession, clearSessions } from '../utils/sessionStorage';
import useAppStore from '../store/useAppStore';
import './History.css';

const PERSONA_ICONS = {
  friendly: User,
  technical: Monitor,
  aggressive: AlertTriangle,
  panel: Users,
};

const PERSONA_COLORS = {
  friendly: '#1a8a4a',
  technical: '#378add',
  aggressive: '#d42a2a',
  panel: '#e8740a',
};

const PERSONA_LABELS = {
  friendly: 'Friendly',
  technical: 'Technical',
  aggressive: 'Tough',
  panel: 'Panel',
};

function formatDate(isoString) {
  if (!isoString) return 'Unknown Date';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getOverallScore(session) {
  if (session.answerScores?.length > 0) {
    const avg = session.answerScores.reduce((a, s) => a + (s.overall || 0), 0) / session.answerScores.length;
    return Math.round(avg * 10);
  }
  return null;
}

function getScoreLevel(score) {
  if (score == null) return 'neutral';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function getScoreColor(score) {
  if (score == null) return 'var(--text-tertiary)';
  if (score >= 70) return 'var(--accent-success)';
  if (score >= 40) return 'var(--accent-secondary)';
  return 'var(--accent-danger)';
}

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'score' | 'duration'

  useEffect(() => {
    setSessions(getSessions().reverse()); // newest first
  }, []);

  const handleViewSession = (session) => {
    useAppStore.setState({ lastSessionData: session });
    navigate('/results');
  };

  const handleDelete = (id) => {
    deleteSession(id);
    setSessions(getSessions().reverse());
    setDeleteConfirmId(null);
  };

  const handleClearAll = () => {
    clearSessions();
    setSessions([]);
    setClearConfirm(false);
  };

  const sorted = [...sessions].sort((a, b) => {
    if (sortBy === 'score') {
      return (getOverallScore(b) || 0) - (getOverallScore(a) || 0);
    }
    if (sortBy === 'duration') {
      return (b.duration || 0) - (a.duration || 0);
    }
    return 0; // already sorted by date (newest first)
  });

  // Stats summary
  const totalSessions = sessions.length;
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (getOverallScore(s) || 0), 0) / sessions.length)
    : 0;
  const totalTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const bestScore = sessions.length > 0
    ? Math.max(...sessions.map((s) => getOverallScore(s) || 0))
    : 0;

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div>
          <h1><HistoryIcon size={22} style={{ marginRight: 10, verticalAlign: 'middle' }} />Session History</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {totalSessions === 0
              ? 'No sessions yet — start your first mock interview'
              : `${totalSessions} session${totalSessions > 1 ? 's' : ''} recorded`}
          </p>
        </div>
        <div className="history-header-actions">
          {sessions.length > 0 && (
            clearConfirm ? (
              <div className="confirm-row">
                <span>Clear all sessions?</span>
                <button className="btn btn-danger btn-sm" onClick={handleClearAll}>Yes, clear</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setClearConfirm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setClearConfirm(true)}>
                <Trash2 size={15} /> Clear All
              </button>
            )
          )}
          <button className="btn btn-success" onClick={() => navigate('/interview')}>
            <RefreshCw size={16} /> New Session
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <div className="history-stats">
          <div className="hstat-card">
            <div className="hstat-icon" style={{ background: 'rgba(212,42,42,0.08)', color: 'var(--accent-primary)' }}>
              <BarChart3 size={20} />
            </div>
            <div className="hstat-value">{totalSessions}</div>
            <div className="hstat-label">Total Sessions</div>
          </div>
          <div className="hstat-card">
            <div className="hstat-icon" style={{ background: 'rgba(26,138,74,0.08)', color: 'var(--accent-success)' }}>
              <TrendingUp size={20} />
            </div>
            <div className="hstat-value" style={{ color: getScoreColor(avgScore) }}>{avgScore}</div>
            <div className="hstat-label">Avg Score</div>
          </div>
          <div className="hstat-card">
            <div className="hstat-icon" style={{ background: 'rgba(55,138,221,0.08)', color: '#378add' }}>
              <Award size={20} />
            </div>
            <div className="hstat-value" style={{ color: getScoreColor(bestScore) }}>{bestScore}</div>
            <div className="hstat-label">Best Score</div>
          </div>
          <div className="hstat-card">
            <div className="hstat-icon" style={{ background: 'rgba(232,116,10,0.08)', color: 'var(--accent-secondary)' }}>
              <Clock size={20} />
            </div>
            <div className="hstat-value">{formatDuration(totalTime)}</div>
            <div className="hstat-label">Total Practice</div>
          </div>
        </div>
      )}

      {/* Sort Bar */}
      {sessions.length > 1 && (
        <div className="history-sort-bar">
          <span className="sort-label">Sort by:</span>
          {['date', 'score', 'duration'].map((opt) => (
            <button
              key={opt}
              className={`sort-btn ${sortBy === opt ? 'active' : ''}`}
              onClick={() => setSortBy(opt)}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="history-empty">
          <div className="empty-icon-box">
            <BarChart3 size={40} />
          </div>
          <h2>No Sessions Yet</h2>
          <p>Complete a mock interview to see your performance history here.</p>
          <button className="btn btn-success btn-lg" onClick={() => navigate('/interview')}>
            <Sparkles size={18} /> Start First Interview
          </button>
        </div>
      )}

      {/* Session Cards */}
      {sorted.length > 0 && (
        <div className="session-list">
          {sorted.map((session, idx) => {
            const Icon = PERSONA_ICONS[session.persona] || User;
            const color = PERSONA_COLORS[session.persona] || 'var(--accent-primary)';
            const score = getOverallScore(session);
            const scoreLevel = getScoreLevel(score);
            const starPassCount = session.starScores?.filter((s) => s.isApplicable && s.overallSTAR >= 60).length || 0;
            const starTotalCount = session.starScores?.filter((s) => s.isApplicable).length || 0;

            return (
              <div
                key={session.id}
                className="session-card"
                style={{ '--persona-color': color }}
              >
                <div className="session-card-left">
                  <div className="session-number">#{sessions.length - idx}</div>
                  <div className="session-persona-icon" style={{ background: `${color}15`, color }}>
                    <Icon size={20} />
                  </div>
                </div>

                <div className="session-card-body">
                  <div className="session-card-top">
                    <div className="session-meta">
                      <span className="session-persona-badge" style={{ background: `${color}15`, color }}>
                        {PERSONA_LABELS[session.persona] || session.persona}
                      </span>
                      <span className="session-date">
                        <Calendar size={12} /> {formatDate(session.date)} at {formatTime(session.date)}
                      </span>
                    </div>
                    {score != null && (
                      <div className={`session-score-ring ${scoreLevel}`}>
                        {score}
                        <span>/100</span>
                      </div>
                    )}
                  </div>

                  <div className="session-card-metrics">
                    <div className="session-metric">
                      <Clock size={13} />
                      <span>{formatDuration(session.duration)}</span>
                      <label>Duration</label>
                    </div>
                    <div className="session-metric">
                      <Activity size={13} />
                      <span style={{ color: getScoreColor(session.postureAvg) }}>
                        {session.postureAvg || '—'}%
                      </span>
                      <label>Posture</label>
                    </div>
                    <div className="session-metric">
                      <Eye size={13} />
                      <span style={{ color: getScoreColor(session.eyeContactAvg) }}>
                        {session.eyeContactAvg || '—'}%
                      </span>
                      <label>Eye Contact</label>
                    </div>
                    <div className="session-metric">
                      <Mic size={13} />
                      <span style={{ color: (session.totalFillers || 0) > 5 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {session.totalFillers || 0}
                      </span>
                      <label>Fillers</label>
                    </div>
                    {starTotalCount > 0 && (
                      <div className="session-metric">
                        <span className="star-mini-label">STAR</span>
                        <span style={{ color: starPassCount === starTotalCount ? 'var(--accent-success)' : 'var(--accent-secondary)' }}>
                          {starPassCount}/{starTotalCount}
                        </span>
                        <label>STAR Pass</label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="session-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleViewSession(session)}
                  >
                    View Report <ChevronRight size={14} />
                  </button>
                  {deleteConfirmId === session.id ? (
                    <div className="delete-confirm">
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(session.id)}>Delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm delete-btn"
                      onClick={() => setDeleteConfirmId(session.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
