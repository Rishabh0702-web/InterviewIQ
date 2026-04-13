import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Download, RefreshCw, TrendingUp,
  CheckCircle, AlertCircle, Lightbulb, Calendar, ArrowRight,
  Mic, Eye, Activity, Brain, Heart, Target, Clock, Award, Zap,
  MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell
} from 'recharts';
import useAppStore from '../store/useAppStore';
import { getSessions, getLatestSession, generatePDFReport } from '../utils/sessionStorage';
import { generateFeedbackReport } from '../agents/feedbackAgent';
import './Results.css';

function getLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function getLevelColor(score) {
  if (score >= 70) return '#1a8a4a';
  if (score >= 40) return '#e8740a';
  return '#d42a2a';
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function Results() {
  const navigate = useNavigate();
  const { lastSessionData } = useAppStore();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedAnswer, setExpandedAnswer] = useState(null);

  // Load data on mount
  useEffect(() => {
    const allSessions = getSessions();
    setSessions(allSessions);

    const data = lastSessionData || getLatestSession();
    if (data) {
      setSessionData(data);
    }
  }, [lastSessionData]);

  // Generate report
  const handleGenerateReport = async () => {
    if (!sessionData) return;
    setLoading(true);
    try {
      const feedbackReport = await generateFeedbackReport(sessionData);
      setReport(feedbackReport);
    } catch (e) {
      console.error('Report generation error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate report when session data is available
  useEffect(() => {
    if (sessionData && !report && !loading) {
      handleGenerateReport();
    }
  }, [sessionData]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!report?.categoryScores) return [];
    return [
      { subject: 'Communication', value: report.categoryScores.communication, fullMark: 100 },
      { subject: 'Body Language', value: report.categoryScores.bodyLanguage, fullMark: 100 },
      { subject: 'Answer Quality', value: report.categoryScores.answerQuality, fullMark: 100 },
      { subject: 'Confidence', value: report.categoryScores.confidence, fullMark: 100 },
      { subject: 'Engagement', value: report.categoryScores.engagement, fullMark: 100 },
    ];
  }, [report]);

  // Timeline data from posture logs
  const timelineData = useMemo(() => {
    if (!sessionData?.postureLogs?.length) return [];
    return sessionData.postureLogs.map((log, i) => ({
      index: i,
      score: log.score,
      level: getLevel(log.score),
    }));
  }, [sessionData]);

  // Progress chart from past sessions
  const progressData = useMemo(() => {
    return sessions.map((s, i) => ({
      session: `#${i + 1}`,
      posture: s.postureAvg || 0,
      eyeContact: s.eyeContactAvg || 0,
      score: s.answerScores?.length > 0
        ? Math.round(s.answerScores.reduce((a, b) => a + (b.overall || 0), 0) / s.answerScores.length * 10)
        : 50,
    }));
  }, [sessions]);

  // Empty state
  if (!sessionData) {
    return (
      <div className="results-page">
        <div className="results-header">
          <div>
            <h1>Analytics Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Performance insights and improvement tracking</p>
          </div>
        </div>
        <div className="empty-results">
          <div className="empty-icon"><BarChart3 size={40} /></div>
          <h2>No Session Data Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 12, maxWidth: 450, margin: '12px auto 24px' }}>
            Complete a mock interview session to see your detailed performance analysis,
            AI-generated feedback, and personalized improvement plan.
          </p>
          <button className="btn btn-success btn-lg" onClick={() => navigate('/interview')}>
            <Mic size={18} /> Start Mock Interview
          </button>
        </div>
      </div>
    );
  }

  // Loading report
  if (loading && !report) {
    return (
      <div className="results-page">
        <div className="results-header">
          <div>
            <h1>Analytics Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Analyzing your performance...</p>
          </div>
        </div>
        <div className="empty-results">
          <div className="spinner spinner-lg" />
          <h3 style={{ marginTop: 20 }}>AI Agent is generating your feedback report...</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>This takes 10-15 seconds</p>
        </div>
      </div>
    );
  }

  const overallScore = report?.overallScore || 65;
  const level = getLevel(overallScore);

  const categoryData = report?.categoryScores || {
    communication: 60, bodyLanguage: 70, answerQuality: 55, confidence: 65, engagement: 60
  };

  const categories = [
    { key: 'communication', label: 'Communication', icon: 'C', color: '#d42a2a' },
    { key: 'bodyLanguage', label: 'Body Language', icon: 'B', color: '#e8740a' },
    { key: 'answerQuality', label: 'Answers', icon: 'A', color: '#d48a0a' },
    { key: 'confidence', label: 'Confidence', icon: 'F', color: '#1a8a4a' },
    { key: 'engagement', label: 'Engagement', icon: 'E', color: '#d42a2a' },
  ];

  return (
    <div className="results-page">
      {/* Header */}
      <div className="results-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Session from {sessionData.date ? new Date(sessionData.date).toLocaleDateString() : 'just now'}
          </p>
        </div>
        <div className="results-actions">
          {report && (
            <button className="btn btn-secondary" onClick={() => generatePDFReport(report)}>
              <Download size={16} /> Download PDF
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/interview')}>
            <RefreshCw size={16} /> New Session
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="results-tabs">
        <button
          className={`results-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={15} /> Overview
        </button>
        <button
          className={`results-tab ${activeTab === 'answers' ? 'active' : ''}`}
          onClick={() => setActiveTab('answers')}
        >
          <MessageSquare size={15} /> Answer Review
          {sessionData.conversationHistory && (
            <span className="tab-count">
              {sessionData.conversationHistory.filter((m) => m.role === 'user').length}
            </span>
          )}
        </button>
        <button
          className={`results-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp size={15} /> Progress
          {sessions.length > 1 && <span className="tab-count">{sessions.length} sessions</span>}
        </button>
      </div>

      {/* ─── TAB: OVERVIEW ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="score-overview">
            <div className="overall-score-card">
              <div className={`score-ring ${level}`}>
                <span className="score-number">{overallScore}</span>
                <span className="score-label">out of 100</span>
              </div>
              <h3 style={{ marginBottom: 8 }}>Overall Performance</h3>
              <p className="overall-summary">{report?.summary || 'Analysis complete.'}</p>
            </div>
            <div className="radar-chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#444444', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#888888', fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="#d42a2a" fill="#d42a2a" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="category-scores">
            {categories.map((cat) => {
              const score = categoryData[cat.key] || 0;
              return (
                <div key={cat.key} className="category-card">
                  <div className="cat-icon" style={{ background: `${cat.color}15` }}>{cat.icon}</div>
                  <div className="cat-score" style={{ color: getLevelColor(score) }}>{score}</div>
                  <div className="cat-label">{cat.label}</div>
                  <div className="cat-bar">
                    <div className="cat-bar-fill" style={{ width: `${score}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="session-stats">
            <div className="session-stat">
              <div className="stat-val" style={{ color: 'var(--accent-primary-light)' }}>
                <Clock size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {formatTime(sessionData.duration || 0)}
              </div>
              <div className="stat-lbl">Duration</div>
            </div>
            <div className="session-stat">
              <div className="stat-val" style={{ color: getLevelColor(sessionData.postureAvg || 70) }}>
                {sessionData.postureAvg || '—'}%
              </div>
              <div className="stat-lbl">Avg Posture</div>
            </div>
            <div className="session-stat">
              <div className="stat-val" style={{ color: getLevelColor(sessionData.eyeContactAvg || 70) }}>
                {sessionData.eyeContactAvg || '—'}%
              </div>
              <div className="stat-lbl">Eye Contact</div>
            </div>
            <div className="session-stat">
              <div className="stat-val" style={{ color: (sessionData.totalFillers || 0) > 5 ? '#ef4444' : '#10b981' }}>
                {sessionData.totalFillers || 0}
              </div>
              <div className="stat-lbl">Filler Words</div>
            </div>
          </div>

          {timelineData.length > 0 && (
            <div className="timeline-section">
              <h3><Activity size={18} /> Session Timeline — Posture Score</h3>
              <div className="timeline-bars">
                {timelineData.map((d, i) => (
                  <div key={i} className={`timeline-bar ${d.level === 'high' ? 'good' : d.level === 'medium' ? 'warning' : 'bad'}`}
                    style={{ height: `${Math.max(8, d.score * 0.48)}px` }} title={`${d.score}% at ${i * 5}s`}
                  />
                ))}
              </div>
              <div className="timeline-legend">
                <div className="timeline-legend-item"><div className="legend-dot" style={{ background: 'var(--accent-success)' }} /> Good (70+)</div>
                <div className="timeline-legend-item"><div className="legend-dot" style={{ background: 'var(--accent-warning)' }} /> Okay (40-70)</div>
                <div className="timeline-legend-item"><div className="legend-dot" style={{ background: 'var(--accent-danger)' }} /> Needs Work (&lt;40)</div>
              </div>
            </div>
          )}

          {report && (
            <div className="feedback-grid">
              <div className="feedback-panel strengths">
                <h3><CheckCircle size={18} /> Top Strengths</h3>
                {(report.strengths || []).map((s, i) => (
                  <div key={i} className="feedback-item strength-item">
                    <div className="fb-title">{s.title}</div>
                    <div className="fb-detail">{s.detail}</div>
                  </div>
                ))}
              </div>
              <div className="feedback-panel weaknesses">
                <h3><AlertCircle size={18} /> Areas to Improve</h3>
                {(report.weaknesses || []).map((w, i) => (
                  <div key={i} className="feedback-item weakness-item">
                    <div className="fb-title">{w.title}</div>
                    <div className="fb-detail">{w.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.actionItems && (
            <div className="action-items">
              <h3><Lightbulb size={18} /> Action Items</h3>
              <div className="action-list">
                {report.actionItems.map((item, i) => (
                  <div key={i} className="action-item">
                    <div className="action-num">{i + 1}</div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.sevenDayPlan && (
            <div className="plan-section">
              <h3><Calendar size={18} /> 7-Day Improvement Plan</h3>
              <div className="plan-grid">
                {report.sevenDayPlan.map((day) => (
                  <div key={day.day} className="plan-day">
                    <div className="day-num">{day.day}</div>
                    <div className="day-focus">{day.focus}</div>
                    <div className="day-tasks">
                      {(day.tasks || []).map((t, i) => <div key={i}>→ {t}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: ANSWER REVIEW ───────────────────────────── */}
      {activeTab === 'answers' && (() => {
        const history = sessionData.conversationHistory || [];
        const userMessages = history.filter((m) => m.role === 'user');
        const interviewerMessages = history.filter((m) => m.role === 'interviewer');
        const scores = sessionData.answerScores || [];
        const starScores = sessionData.starScores || [];

        if (userMessages.length === 0) {
          return (
            <div className="empty-results">
              <div className="empty-icon"><MessageSquare size={40} /></div>
              <h2>No Answer Data</h2>
              <p style={{ color: 'var(--text-secondary)' }}>No conversation was recorded in this session.</p>
            </div>
          );
        }

        const SCORE_DIMS = [
          { key: 'clarity', label: 'Clarity', color: '#378add' },
          { key: 'relevance', label: 'Relevance', color: '#1a8a4a' },
          { key: 'structure', label: 'Structure', color: '#e8740a' },
          { key: 'depth', label: 'Depth', color: '#8b5cf6' },
          { key: 'confidence', label: 'Confidence', color: '#d42a2a' },
        ];

        return (
          <div className="answer-review">
            <div className="answer-review-summary">
              <div className="ar-stat">
                <span className="ar-stat-val">{userMessages.length}</span>
                <span className="ar-stat-lbl">Answers Given</span>
              </div>
              {scores.length > 0 && (
                <div className="ar-stat">
                  <span className="ar-stat-val" style={{ color: getLevelColor(Math.round(scores.reduce((a, s) => a + (s.overall || 0), 0) / scores.length * 10)) }}>
                    {(scores.reduce((a, s) => a + (s.overall || 0), 0) / scores.length).toFixed(1)}/10
                  </span>
                  <span className="ar-stat-lbl">Avg Score</span>
                </div>
              )}
              {starScores.filter((s) => s.isApplicable).length > 0 && (
                <div className="ar-stat">
                  <span className="ar-stat-val" style={{ color: 'var(--accent-success)' }}>
                    {starScores.filter((s) => s.isApplicable && s.overallSTAR >= 60).length}/
                    {starScores.filter((s) => s.isApplicable).length}
                  </span>
                  <span className="ar-stat-lbl">STAR Passed</span>
                </div>
              )}
              <div className="ar-stat">
                <span className="ar-stat-val" style={{ color: (sessionData.totalFillers || 0) > 5 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                  {sessionData.totalFillers || 0}
                </span>
                <span className="ar-stat-lbl">Filler Words</span>
              </div>
            </div>

            <div className="answer-cards">
              {userMessages.map((msg, idx) => {
                const question = interviewerMessages[idx]?.content || `Question ${idx + 1}`;
                const score = scores[idx];
                const star = starScores[idx];
                const isExpanded = expandedAnswer === idx;
                const scoreLevel = score ? (score.overall >= 7 ? 'high' : score.overall >= 5 ? 'medium' : 'low') : null;

                return (
                  <div key={idx} className="answer-card">
                    <div className="answer-card-question">
                      <span className="answer-q-num">Q{idx + 1}</span>
                      <span className="answer-q-text">{question}</span>
                      {score && (
                        <span className={`answer-overall-score ${scoreLevel}`}>
                          {score.overall?.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <div className="answer-text">{msg.content}</div>
                    {score && (
                      <div className="answer-score-bars">
                        {SCORE_DIMS.map((dim) => (
                          <div key={dim.key} className="score-dim-row">
                            <span className="dim-label">{dim.label}</span>
                            <div className="dim-bar">
                              <div className="dim-bar-fill" style={{ width: `${(score[dim.key] || 0) * 10}%`, background: dim.color }} />
                            </div>
                            <span className="dim-val" style={{ color: dim.color }}>{score[dim.key] || 0}/10</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {score?.quickTip && (
                      <div className="answer-quick-tip">
                        <Lightbulb size={13} /> {score.quickTip}
                      </div>
                    )}
                    {star?.isApplicable && (
                      <div className="star-breakdown">
                        <div className="star-breakdown-header">
                          <span className="star-breakdown-title">STAR Analysis</span>
                          <span className={`star-overall-badge ${star.overallSTAR >= 60 ? 'good' : 'low'}`}>{star.overallSTAR}/100</span>
                          <button className="star-expand-btn" onClick={() => setExpandedAnswer(isExpanded ? null : idx)}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        <div className="star-pills-row">
                          {['situation', 'task', 'action', 'result'].map((key) => (
                            <div key={key} className={`star-pill ${star[key]?.present ? 'present' : 'missing'}`}>
                              <span className="star-pill-letter">{key.charAt(0).toUpperCase()}</span>
                              <span className="star-pill-name">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                              {star[key]?.present && <span className="star-pill-score">{star[key]?.score}/10</span>}
                            </div>
                          ))}
                        </div>
                        {isExpanded && (
                          <div className="star-details">
                            {['situation', 'task', 'action', 'result'].map((key) => star[key]?.note && (
                              <div key={key} className="star-detail-row">
                                <span className="star-detail-key">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                                <span className="star-detail-quote">"{star[key]?.note}"</span>
                              </div>
                            ))}
                            {star.tip && <div className="star-detail-tip"><Lightbulb size={13} /> {star.tip}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ─── TAB: PROGRESS ────────────────────────────────── */}
      {activeTab === 'progress' && (
        <div className="progress-section">
          {sessions.length < 2 ? (
            <div className="empty-results">
              <div className="empty-icon"><TrendingUp size={40} /></div>
              <h2>Need More Sessions</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 12, maxWidth: 400, margin: '12px auto 24px' }}>
                Complete at least 2 sessions to see your progress over time.
              </p>
              <button className="btn btn-success btn-lg" onClick={() => navigate('/interview')}>
                <Mic size={18} /> New Interview
              </button>
            </div>
          ) : (
            <>
              <h3><TrendingUp size={18} /> Progress Over Sessions</h3>
              <div className="progress-comparison" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="progress-card">
                  <div className="pc-label">First Session</div>
                  <div className="pc-score" style={{ color: getLevelColor(progressData[0]?.score || 0) }}>{progressData[0]?.score || '—'}</div>
                </div>
                <div className="progress-arrow">→</div>
                <div className="progress-card">
                  <div className="pc-label">Latest Session</div>
                  <div className="pc-score" style={{ color: getLevelColor(progressData[progressData.length - 1]?.score || 0) }}>{progressData[progressData.length - 1]?.score || '—'}</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="session" tick={{ fill: '#444444', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#444444', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #ddd', borderRadius: 8, fontSize: 12, color: '#111' }} />
                  <Line type="monotone" dataKey="posture" stroke="#d42a2a" strokeWidth={2} dot={{ r: 4 }} name="Posture" />
                  <Line type="monotone" dataKey="eyeContact" stroke="#e8740a" strokeWidth={2} dot={{ r: 4 }} name="Eye Contact" />
                  <Line type="monotone" dataKey="score" stroke="#1a8a4a" strokeWidth={2} dot={{ r: 4 }} name="Answer Score" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
