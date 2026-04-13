# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# InterviewIQ — AI Mock Interview Platform

> Practice interviews with a real-time AI interviewer that watches your posture, tracks your emotions, listens to your answers, and coaches you live.
---

## What It Does

InterviewIQ simulates a full job interview experience in your browser — no backend required. Upload your resume and a job description, and the platform generates personalized questions, conducts a live mock interview with an AI interviewer (that actually speaks to you), and gives you a detailed performance report at the end.

**Three modes:**

- **Preparation Mode** — Paste a JD + upload your resume. AI agents analyze skill gaps and generate 30–50 tailored questions across Technical, Behavioral, Situational, and Culture-fit categories.
- **Mock Interview** — A live video call simulation. The AI interviewer speaks your questions aloud (via ElevenLabs), listens to your answers via microphone, and scores them in real-time.
- **Analytics** — Post-interview dashboard with posture timeline, emotion tracking, filler word count, category scores, strengths/weaknesses, action items, and a 7-day improvement plan.

---

## Features

| Feature | Details |
|---|---|
| AI Interviewer Personas | Friendly HR, Technical Lead, Tough Manager, Panel Interview |
| Voice Selection | 8 natural voices (4M / 4F) via ElevenLabs — falls back to browser TTS |
| Real-time Posture Detection | MediaPipe PoseLandmarker — scores shoulder alignment, slouch, head position |
| Emotion & Eye Contact | MediaPipe FaceLandmarker — detects calm/nervous/happy/tense + eye gaze % |
| Filler Word Tracking | Live highlights for "um", "uh", "like", "basically", etc. |
| Whisper Coach | Real-time tip after each answer while the next question loads |
| Answer Scoring | Each answer scored 1–10 across clarity, relevance, structure, depth, confidence |
| Resume Gap Analysis | AI compares your resume vs JD — shows strengths, gaps, and match % |
| PDF Export | Download your full feedback report as a PDF |
| Progress Tracking | Multiple sessions saved locally — charts show improvement over time |

---

## Tech Stack

- **Frontend** — React 19, Vite 8, React Router v7, Zustand
- **AI / LLM** — Groq API (`llama-3.1-8b-instant`) for all agent logic
- **Computer Vision** — MediaPipe Tasks Vision (pose + face, runs fully in-browser)
- **Text-to-Speech** — ElevenLabs API (`eleven_turbo_v2_5`) with browser SpeechSynthesis fallback
- **Speech-to-Text** — Web Speech API (browser-native, no API needed)
- **Charts** — Recharts
- **Animations** — Framer Motion
- **PDF Generation** — jsPDF
- **Resume Parsing** — pdfjs-dist

> No backend. All ML runs client-side via MediaPipe WASM. Only LLM and TTS calls go to external APIs.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/interviewiq.git
cd interviewiq
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Required — get free key at console.groq.com
VITE_GROQ_API_KEY=your_groq_api_key

# Optional — get free key at elevenlabs.io (10k chars/month free)
# Without this, browser TTS is used as fallback
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
src/
├── agents/
│   ├── answerScorerAgent.js    # Scores each answer 1–10 across 5 dimensions
│   ├── feedbackAgent.js        # Generates full post-interview report
│   ├── jdParserAgent.js        # Extracts structured data from job description
│   ├── personaAgent.js         # Manages interviewer personas + whisper coach
│   ├── questionBankAgent.js    # Generates personalized question bank
│   └── resumeGapAgent.js       # Compares resume vs JD, finds gaps
├── hooks/
│   ├── useCamera.js            # Webcam access and stream management
│   ├── useFaceDetection.js     # MediaPipe face landmarks → emotion + eye contact
│   ├── usePoseDetection.js     # MediaPipe pose landmarks → posture score
│   ├── useSpeechRecognition.js # Web Speech API → transcript + filler detection
│   └── useTextToSpeech.js      # ElevenLabs TTS + browser fallback
├── pages/
│   ├── Home.jsx                # Landing page
│   ├── PrepMode.jsx            # JD input → gap analysis → question bank
│   ├── InterviewMode.jsx       # Live interview session
│   └── Results.jsx             # Analytics dashboard + PDF export
├── store/
│   └── useAppStore.js          # Zustand global state
└── utils/
    ├── aiClient.js             # Groq API wrapper
    ├── pdfParser.js            # PDF text extraction
    └── sessionStorage.js       # localStorage session management + PDF export
```

---

## How the Interview Flow Works

```
User speaks → Web Speech API → transcript
     ↓
3 sec silence → answer complete → mic pauses
     ↓
answerScorerAgent scores the answer (async)
whisperCoach generates a tip (async)
personaAgent generates next question
     ↓
ElevenLabs speaks the question aloud
     ↓
Speech finishes → mic auto-resumes → repeat
```

---

## API Keys

| Key | Where to get | Free tier |
|---|---|---|
| `VITE_GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Yes — generous limits |
| `VITE_ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | Yes — 10k chars/month |

Both are optional in the sense that the app won't crash without them — but you need Groq for AI features and ElevenLabs for high-quality voice (browser TTS is the fallback).

---

## Available Voices (ElevenLabs)

| Name | Gender | Style | Best for |
|---|---|---|---|
| Antoni | Male | Warm & friendly | Friendly HR |
| Arnold | Male | Confident & crisp | Technical Lead |
| Adam | Male | Deep & authoritative | Tough Manager |
| Sam | Male | Calm & professional | Panel Interview |
| Bella | Female | Warm & encouraging | Friendly HR |
| Elli | Female | Bright & clear | Technical Lead |
| Gigi | Female | Sharp & direct | Tough Manager |
| Grace | Female | Composed & professional | Panel Interview |

---

## Hackathon / Portfolio Note

This project was built as part of an AI/ML portfolio by a 2nd-year CS student. It demonstrates:
- Multi-agent LLM orchestration (6 specialized agents)
- Real-time computer vision in the browser (no Python backend)
- Full-stack React architecture with Zustand state management
- Integration of 3 external AI APIs in a single cohesive product

---

## License

MIT
