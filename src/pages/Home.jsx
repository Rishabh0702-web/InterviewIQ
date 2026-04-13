import { useNavigate } from 'react-router-dom';
import { 
  FileText, Video, BarChart3, ArrowRight, Eye, 
  Bot, LayoutTemplate, Activity, Target
} from 'lucide-react';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      
      {/* --- HERO BENTO GRID --- */}
      <section className="bento-hero">
        
        {/* Main large text block */}
        <div className="bento-card bento-main">
          <div className="hero-badge">
            <div className="dot" />
            <span>Powered by Agentic AI</span>
          </div>
          <h1>
            Refine your narrative<br />
            with <span className="highlight">AI Coaching.</span>
          </h1>
          <p>
            An elite Interview Ecosystem deploying multiple autonomous AI agents and live 
            computer vision to drastically scale your preparation.
          </p>
          <div className="bento-actions">
            <button className="bento-btn btn-primary-bento" onClick={() => navigate('/prep')}>
              Start Preparing <ArrowRight size={18} />
            </button>
            <button className="bento-btn btn-secondary-bento" onClick={() => navigate('/interview')}>
              <Video size={18} /> Mock Interview
            </button>
          </div>
        </div>

        {/* Top Right Grid Cards */}
        <div className="bento-card bento-stat stat-red">
          <div className="icon-wrapper"><Bot size={24} /></div>
          <h3>6</h3>
          <p>Autonomous AI Agents</p>
        </div>

        <div className="bento-card bento-stat stat-green">
          <div className="icon-wrapper"><Target size={24} /></div>
          <h3>50+</h3>
          <p>Custom Questions Built</p>
        </div>

        <div className="bento-card bento-stat stat-orange">
          <div className="icon-wrapper"><Eye size={24} /></div>
          <h3>Live</h3>
          <p>Computer Vision Coaching</p>
        </div>

        <div className="bento-card bento-stat">
          <div className="icon-wrapper"><Activity size={24} /></div>
          <h3>360°</h3>
          <p>Post-Session Feedback</p>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <h2 className="section-title">The Hiring Ecosystem</h2>
      <p className="section-subtitle">Three sequential modes designed to turn fundamental practice into mastery.</p>
      
      <section className="bento-features">
        <div className="bento-feature-card" onClick={() => navigate('/prep')}>
          <div className="feature-ill">
            <LayoutTemplate size={48} strokeWidth={1.5} />
          </div>
          <h3>Preparation Sandbox</h3>
          <p>
            Upload your resume and any Job Description. Our intelligent Parser Agent dynamically extracts
            your experience gaps and spins up a tailored 50+ question database for you.
          </p>
          <div className="tags">
            <span className="tag">JD Parsing</span>
            <span className="tag">Resume Gap AI</span>
          </div>
        </div>

        <div className="bento-feature-card" onClick={() => navigate('/interview')}>
          <div className="feature-ill">
            <Video size={48} strokeWidth={1.5} />
          </div>
          <h3>Simulated Pressure</h3>
          <p>
            Face aggressive or friendly AI HR personas in a mock Google Meet interface.
            Live vision monitors your eye contact, posture, and micro-expressions in real-time.
          </p>
          <div className="tags">
            <span className="tag">Live Emotion API</span>
            <span className="tag">Voice Synthesis</span>
          </div>
        </div>

        <div className="bento-feature-card" onClick={() => navigate('/results')}>
          <div className="feature-ill">
            <BarChart3 size={48} strokeWidth={1.5} />
          </div>
          <h3>Strategic Analytics</h3>
          <p>
            Review exact answers with literary-grade feedback and receive structural STAR 
            technique corrections. See your stress levels mapped against interview difficulty.
          </p>
          <div className="tags">
            <span className="tag">STAR Framework</span>
            <span className="tag">Timeline Graphs</span>
          </div>
        </div>
      </section>

      {/* --- PIPELINE --- */}
      <section className="bento-pipeline">
        <h2>The Architecture of Success</h2>
        <div className="timeline-grid">
          <div className="timeline-step">
            <div className="timeline-dot">1</div>
            <h4>Input</h4>
            <p>Feed the ecosystem your resume & the job target.</p>
          </div>
          
          <div className="timeline-step">
            <div className="timeline-dot">2</div>
            <h4>Analyze</h4>
            <p>Agent swarms isolate skill gaps.</p>
          </div>
          
          <div className="timeline-step">
            <div className="timeline-dot">3</div>
            <h4>Generate</h4>
            <p>Custom rigorous questions are born.</p>
          </div>
          
          <div className="timeline-step">
            <div className="timeline-dot">4</div>
            <h4>Deploy</h4>
            <p>Enter the hot-seat with AI personas.</p>
          </div>
          
          <div className="timeline-step">
            <div className="timeline-dot">5</div>
            <h4>Refine</h4>
            <p>Absorb ruthless, highly-specific data.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
