import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // JD Data
  jdText: '',
  jdData: null, // parsed JD structure
  jdLoading: false,
  setJdText: (text) => set({ jdText: text }),
  setJdData: (data) => set({ jdData: data, jdLoading: false }),
  setJdLoading: (loading) => set({ jdLoading: loading }),

  // Resume Data
  resumeFile: null,
  resumeText: '',
  resumeLoading: false,
  setResumeFile: (file) => set({ resumeFile: file }),
  setResumeText: (text) => set({ resumeText: text }),
  setResumeLoading: (loading) => set({ resumeLoading: loading }),

  // Gap Analysis
  gapData: null,
  gapLoading: false,
  setGapData: (data) => set({ gapData: data, gapLoading: false }),
  setGapLoading: (loading) => set({ gapLoading: loading }),

  // Question Bank
  questions: [],
  questionsLoading: false,
  bookmarkedQuestions: new Set(),
  setQuestions: (questions) => set({ questions, questionsLoading: false }),
  setQuestionsLoading: (loading) => set({ questionsLoading: loading }),
  toggleBookmark: (questionId) => set((state) => {
    const newBookmarks = new Set(state.bookmarkedQuestions);
    if (newBookmarks.has(questionId)) {
      newBookmarks.delete(questionId);
    } else {
      newBookmarks.add(questionId);
    }
    return { bookmarkedQuestions: newBookmarks };
  }),

  // Prep Mode Step
  prepStep: 0, // 0=JD, 1=Resume, 2=Questions
  setPrepStep: (step) => set({ prepStep: step }),

  // Interview Session
  isInterviewActive: false,
  interviewPersona: 'friendly',
  sessionTimer: 0,
  lastSessionData: null,
  setInterviewActive: (active) => set({ isInterviewActive: active }),
  setInterviewPersona: (persona) => set({ interviewPersona: persona }),
  setSessionTimer: (timer) => set({ sessionTimer: timer }),

  // Vision Data
  postureScore: 100,
  postureAlerts: [],
  emotionState: 'neutral',
  confidenceScore: 75,
  eyeContactPercentage: 100,
  visionAlerts: [],
  postureLogs: [],
  emotionLogs: [],
  eyeContactLogs: [],

  updatePosture: (score, alert) => set((state) => ({
    postureScore: score,
    postureAlerts: alert
      ? [...state.postureAlerts.slice(-4), { text: alert, time: Date.now() }]
      : state.postureAlerts,
    postureLogs: [...state.postureLogs, { score, time: Date.now() }],
  })),

  updateEmotion: (emotion, confidence) => set((state) => ({
    emotionState: emotion,
    confidenceScore: confidence,
    emotionLogs: [...state.emotionLogs, { emotion, confidence, time: Date.now() }],
  })),

  updateEyeContact: (isLooking) => set((state) => {
    const logs = [...state.eyeContactLogs, { looking: isLooking, time: Date.now() }];
    const lookingCount = logs.filter((l) => l.looking).length;
    const percentage = Math.round((lookingCount / logs.length) * 100);
    return {
      eyeContactPercentage: percentage,
      eyeContactLogs: logs,
      visionAlerts: !isLooking
        ? [...state.visionAlerts.slice(-4), { text: 'Maintain eye contact!', time: Date.now(), type: 'eye' }]
        : state.visionAlerts,
    };
  }),

  addVisionAlert: (alert) => set((state) => ({
    visionAlerts: [...state.visionAlerts.slice(-4), { ...alert, time: Date.now() }],
  })),

  // Reset
  resetSession: () => set({
    postureScore: 100,
    postureAlerts: [],
    emotionState: 'neutral',
    confidenceScore: 75,
    eyeContactPercentage: 100,
    visionAlerts: [],
    postureLogs: [],
    emotionLogs: [],
    eyeContactLogs: [],
    isInterviewActive: false,
    sessionTimer: 0,
  }),

  resetAll: () => set({
    jdText: '',
    jdData: null,
    jdLoading: false,
    resumeFile: null,
    resumeText: '',
    resumeLoading: false,
    gapData: null,
    gapLoading: false,
    questions: [],
    questionsLoading: false,
    bookmarkedQuestions: new Set(),
    prepStep: 0,
    isInterviewActive: false,
    interviewPersona: 'friendly',
    sessionTimer: 0,
    postureScore: 100,
    postureAlerts: [],
    emotionState: 'neutral',
    confidenceScore: 75,
    eyeContactPercentage: 100,
    visionAlerts: [],
    postureLogs: [],
    emotionLogs: [],
    eyeContactLogs: [],
  }),
}));

export default useAppStore;
