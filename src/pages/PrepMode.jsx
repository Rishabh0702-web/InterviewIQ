import { useState } from 'react';
import {
  FileText, Upload, BookOpen, ChevronRight, Sparkles, AlertCircle,
  CheckCircle, Star, StarOff, Eye, Target, Lightbulb, Briefcase,
  Award, TrendingUp, Code, Users, Heart, ArrowRight, FileCheck
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { callJDParserAgent } from '../agents/jdParserAgent';
import { callResumeGapAgent } from '../agents/resumeGapAgent';
import { callQuestionBankAgent } from '../agents/questionBankAgent';
import { extractTextFromPDF } from '../utils/pdfParser';
import './PrepMode.css';

// ─── Step Indicator ─────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Job Description', 'Resume & Analysis', 'Question Bank'];
  return (
    <div className="step-indicator">
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`step-dot ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
            {i < step ? <CheckCircle size={16} /> : i + 1}
          </div>
          <span style={{ fontSize: '0.8rem', color: i === step ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: i === step ? 600 : 400 }}>
            {label}
          </span>
          {i < steps.length - 1 && <div className={`step-line ${i < step ? 'completed' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── JD Input Panel ─────────────────────────────────────
function JDInputPanel() {
  const { jdText, setJdText, jdData, jdLoading, setJdLoading, setJdData, setPrepStep } = useAppStore();
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!jdText.trim()) return;
    setError('');
    setJdLoading(true);
    try {
      const data = await callJDParserAgent(jdText);
      setJdData(data);
    } catch (e) {
      setError(e.message || 'Failed to parse job description.');
      setJdLoading(false);
    }
  };

  if (jdLoading) {
    return (
      <div className="loading-panel">
        <div className="spinner spinner-lg" />
        <p>AI Agent is analyzing the job description...</p>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (jdData) {
    return (
      <div className="prep-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h3><CheckCircle size={20} style={{ color: 'var(--accent-success)', marginRight: 8 }} />Job Description Parsed</h3>
          <button className="btn btn-primary" onClick={() => setPrepStep(1)}>
            Next: Upload Resume <ChevronRight size={16} />
          </button>
        </div>
        <div className="jd-results">
          <div className="jd-result-card">
            <h4><Briefcase size={16} /> Role</h4>
            <div className="value">{jdData.jobTitle || 'N/A'}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className="badge badge-primary">{jdData.roleType || 'Full-time'}</span>
              <span className="badge badge-warning">{jdData.experienceLevel || 'Mid'}</span>
            </div>
          </div>
          <div className="jd-result-card">
            <h4><Award size={16} /> Company</h4>
            <div className="value">{jdData.company || 'Not specified'}</div>
            {jdData.salaryRange && jdData.salaryRange !== 'Not specified' && (
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                Salary: {jdData.salaryRange}
              </div>
            )}
          </div>
          <div className="jd-result-card" style={{ gridColumn: 'span 2' }}>
            <h4><Code size={16} /> Required Skills</h4>
            <div className="skill-chips">
              {(jdData.requiredSkills || []).map((skill, i) => (
                <span key={i} className="skill-chip required">{skill}</span>
              ))}
            </div>
            {jdData.preferredSkills?.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}><TrendingUp size={16} /> Preferred Skills</h4>
                <div className="skill-chips">
                  {jdData.preferredSkills.map((skill, i) => (
                    <span key={i} className="skill-chip preferred">{skill}</span>
                  ))}
                </div>
              </>
            )}
            {jdData.softSkills?.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}><Users size={16} /> Soft Skills</h4>
                <div className="skill-chips">
                  {jdData.softSkills.map((skill, i) => (
                    <span key={i} className="skill-chip soft">{skill}</span>
                  ))}
                </div>
              </>
            )}
          </div>
          {jdData.responsibilities?.length > 0 && (
            <div className="jd-result-card" style={{ gridColumn: 'span 2' }}>
              <h4><Target size={16} /> Key Responsibilities</h4>
              <ul className="responsibilities-list">
                {jdData.responsibilities.slice(0, 8).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="prep-panel jd-input-panel">
      <div>
        <h3>Paste Job Description</h3>
        <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
          Paste the full job description text below. Our AI agent will extract all key requirements.
        </p>
      </div>
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      <div className="input-group">
        <textarea
          className="input jd-textarea"
          placeholder="Paste the complete job description here...&#10;&#10;Example: We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={10}
        />
      </div>
      <div className="jd-actions">
        <button
          className="btn btn-success"
          onClick={handleParse}
          disabled={!jdText.trim()}
        >
          <Sparkles size={16} />
          Analyze with AI Agent
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          {jdText.length > 0 ? `${jdText.split(/\s+/).length} words` : 'Waiting for input...'}
        </span>
      </div>
    </div>
  );
}

// ─── Resume Upload Panel ────────────────────────────────
function ResumeUploadPanel() {
  const {
    resumeFile, setResumeFile, setResumeText, resumeLoading, setResumeLoading,
    jdData, gapData, gapLoading, setGapLoading, setGapData, setPrepStep
  } = useAppStore();
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError('');
    setResumeFile(file);
    setResumeLoading(true);

    try {
      const text = await extractTextFromPDF(file);
      setResumeText(text);
      useAppStore.setState({ resumeLoading: false });

      // Auto-run gap analysis
      setGapLoading(true);
      const gapResult = await callResumeGapAgent(text, jdData);
      setGapData(gapResult);
    } catch (e) {
      setError(e.message || 'Failed to process resume.');
      useAppStore.setState({ resumeLoading: false, gapLoading: false });
    }
  };

  if (resumeLoading || gapLoading) {
    return (
      <div className="loading-panel">
        <div className="spinner spinner-lg" />
        <p>{resumeLoading ? 'Extracting text from PDF...' : 'AI Agent is analyzing gaps between your resume and the JD...'}</p>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (gapData) {
    const matchLevel = gapData.overallMatch >= 70 ? 'high' : gapData.overallMatch >= 40 ? 'medium' : 'low';
    return (
      <div className="prep-panel gap-analysis">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h3><CheckCircle size={20} style={{ color: 'var(--accent-success)', marginRight: 8 }} />Gap Analysis Complete</h3>
          <button className="btn btn-primary" onClick={() => setPrepStep(2)}>
            Generate Questions <ChevronRight size={16} />
          </button>
        </div>

        <div className="gap-overview">
          <div className={`match-circle ${matchLevel}`}>
            <span className="match-value">{gapData.overallMatch}%</span>
            <span className="match-label">Match</span>
          </div>
          <div className="gap-overview-details">
            <h3>Resume-JD Alignment</h3>
            <p style={{ fontSize: '0.9rem' }}>{gapData.experienceMatch?.verdict || 'Analysis complete'}</p>
            <div className="gap-overview-stats">
              <div className="gap-stat"><div className="dot green" /><span>{gapData.strengths?.length || 0} Strengths</span></div>
              <div className="gap-stat"><div className="dot red" /><span>{gapData.gaps?.length || 0} Gaps</span></div>
              <div className="gap-stat"><div className="dot gray" /><span>{gapData.neutralSkills?.length || 0} Neutral</span></div>
            </div>
          </div>
        </div>

        <div className="gap-columns">
          <div className="gap-column strengths">
            <h4><CheckCircle size={16} /> Strengths</h4>
            {(gapData.strengths || []).map((s, i) => (
              <div key={i} className="gap-item strength">
                <span className="item-label">{s.skill}</span>
                <span className="item-detail">{s.evidence}</span>
              </div>
            ))}
          </div>
          <div className="gap-column gaps">
            <h4><AlertCircle size={16} /> Gaps</h4>
            {(gapData.gaps || []).map((g, i) => (
              <div key={i} className="gap-item gap-missing">
                <span className="item-label">{g.skill}</span>
                <span className="item-detail">{g.suggestion}</span>
                <span className="badge badge-danger" style={{ marginTop: 4 }}>{g.importance}</span>
              </div>
            ))}
          </div>
          <div className="gap-column neutral">
            <h4><Eye size={16} /> Partial Match</h4>
            {(gapData.neutralSkills || []).map((n, i) => (
              <div key={i} className="gap-item neutral-item">
                <span className="item-label">{n.skill}</span>
                <span className="item-detail">{n.note}</span>
              </div>
            ))}
          </div>
        </div>

        {gapData.topRecommendations?.length > 0 && (
          <div className="recommendations">
            <h4><Lightbulb size={16} /> Top Recommendations</h4>
            <ol>
              {gapData.topRecommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="prep-panel resume-upload-panel">
      <div>
        <h3>Upload Your Resume</h3>
        <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
          Upload your resume PDF. Our AI agent will compare it against the job description to find gaps and strengths.
        </p>
      </div>
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      <div className={`upload-zone ${resumeFile ? 'has-file' : ''}`}>
        <input type="file" accept=".pdf" onChange={handleFileChange} />
        <div className="upload-icon">
          {resumeFile ? <FileCheck size={28} /> : <Upload size={28} />}
        </div>
        <h3>{resumeFile ? resumeFile.name : 'Drop your resume here'}</h3>
        <p>{resumeFile ? `${(resumeFile.size / 1024).toFixed(1)} KB` : 'Supports PDF files • Click or drag to upload'}</p>
      </div>
      <button className="btn btn-ghost" onClick={() => setPrepStep(0)}>
        ← Back to Job Description
      </button>
    </div>
  );
}

// ─── Question Bank Panel ────────────────────────────────
function QuestionBankPanel() {
  const {
    questions, questionsLoading, setQuestionsLoading, setQuestions,
    jdData, gapData, bookmarkedQuestions, toggleBookmark, setPrepStep
  } = useAppStore();
  const [activeTab, setActiveTab] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setQuestionsLoading(true);
    try {
      const result = await callQuestionBankAgent(jdData, gapData);
      setQuestions(result);
    } catch (e) {
      setError(e.message || 'Failed to generate questions.');
      setQuestionsLoading(false);
    }
  };

  if (questionsLoading) {
    return (
      <div className="loading-panel">
        <div className="spinner spinner-lg" />
        <p>AI Agent is generating personalized questions...</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>This may take 15-30 seconds</p>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="prep-panel" style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ width: 70, height: 70, borderRadius: 16, background: 'rgba(212, 42, 42, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <BookOpen size={32} color="var(--accent-primary)" />
        </div>
        <h3>Generate Your Question Bank</h3>
        <p style={{ maxWidth: 400, margin: '12px auto 24px' }}>
          Based on the JD analysis and your resume gaps, our AI will create 30-40 personalized interview questions.
        </p>
        {error && <div className="error-banner" style={{ maxWidth: 400, margin: '0 auto 16px' }}><AlertCircle size={18} />{error}</div>}
        <button className="btn btn-success btn-lg" onClick={handleGenerate}>
          <Sparkles size={18} />
          Generate Question Bank
        </button>
        <br />
        <button className="btn btn-ghost" onClick={() => setPrepStep(1)} style={{ marginTop: 16 }}>
          ← Back to Gap Analysis
        </button>
      </div>
    );
  }

  const categories = ['All', 'Technical', 'Behavioral', 'Situational', 'Culture-fit'];
  const filtered = activeTab === 'All' ? questions : questions.filter((q) => q.category === activeTab);
  const categoryIcons = { Technical: <Code size={14} />, Behavioral: <Heart size={14} />, Situational: <Target size={14} />, 'Culture-fit': <Users size={14} /> };

  return (
    <div className="prep-panel question-bank">
      <div className="question-bank-header">
        <div>
          <h3>Question Bank</h3>
          <span className="question-count">{questions.length} questions generated</span>
        </div>
      </div>

      <div className="question-tabs">
        <div className="tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tab ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat} {cat !== 'All' && `(${questions.filter((q) => q.category === cat).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="question-list">
        {filtered.map((q) => (
          <div key={q.id} className="question-card" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
            <div className="question-card-header">
              <div className="question-meta">
                <span className={`badge ${q.difficulty === 'Easy' ? 'badge-success' : q.difficulty === 'Medium' ? 'badge-warning' : 'badge-danger'}`}>
                  {q.difficulty}
                </span>
                <span className="badge badge-primary">
                  {categoryIcons[q.category]} {q.category}
                </span>
                {q.isGapRelated && <span className="badge badge-danger">Gap Area</span>}
              </div>
              <button
                className={`bookmark-btn ${bookmarkedQuestions.has(q.id) ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleBookmark(q.id); }}
              >
                {bookmarkedQuestions.has(q.id) ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
              </button>
            </div>
            <div className="question-text">{q.question}</div>
            {expandedId === q.id && (
              <div className="question-hints">
                <h5>Key Points to Cover</h5>
                <ul>
                  {(q.idealAnswerHints || []).map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ul>
                <div className="question-intent">
                  <strong>Intent:</strong> {q.intentBehind}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main PrepMode Component ────────────────────────────
export default function PrepMode() {
  const { prepStep } = useAppStore();

  return (
    <div className="prep-mode">
      <div className="prep-header">
        <div>
          <h1>Preparation Mode</h1>
          <p>AI-powered analysis of your resume against the job description</p>
        </div>
        <StepIndicator step={prepStep} />
      </div>

      {prepStep === 0 && <JDInputPanel />}
      {prepStep === 1 && <ResumeUploadPanel />}
      {prepStep === 2 && <QuestionBankPanel />}
    </div>
  );
}
