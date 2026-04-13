import { callAI } from '../utils/aiClient';

/**
 * Generate comprehensive post-interview feedback report.
 * @param {Object} sessionData - Complete session data
 * @returns {Promise<Object>} - Feedback report
 */
export async function generateFeedbackReport(sessionData) {
  const {
    transcript = '',
    answerScores = [],
    postureAvg = 0,
    emotionSummary = {},
    eyeContactAvg = 0,
    fillerCount = {},
    totalFillers = 0,
    duration = 0,
    persona = 'friendly',
    conversationHistory = [],
  } = sessionData;

  const prompt = `You are an expert Interview Feedback AI Agent. Analyze this complete mock interview session data and generate a comprehensive feedback report.

SESSION DATA:
- Duration: ${Math.round(duration / 60)} minutes
- Interviewer Persona: ${persona}
- Posture Score (avg): ${postureAvg}/100
- Eye Contact: ${eyeContactAvg}%
- Total Filler Words: ${totalFillers}
- Filler Breakdown: ${JSON.stringify(fillerCount)}
- Emotion Summary: ${JSON.stringify(emotionSummary)}
- Answer Scores: ${JSON.stringify(answerScores.map(a => ({ clarity: a.clarity, relevance: a.relevance, structure: a.structure, depth: a.depth, confidence: a.confidence, overall: a.overall })))}

CONVERSATION:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 3000)}

Generate a JSON report with:
{
  "overallScore": number (0-100),
  "categoryScores": {
    "communication": number (0-100),
    "bodyLanguage": number (0-100),
    "answerQuality": number (0-100),
    "confidence": number (0-100),
    "engagement": number (0-100)
  },
  "strengths": [
    { "title": "string", "detail": "string" }
  ],
  "weaknesses": [
    { "title": "string", "detail": "string" }
  ],
  "actionItems": [
    "5 specific, actionable improvement tips"
  ],
  "sevenDayPlan": [
    { "day": 1, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 2, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 3, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 4, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 5, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 6, "focus": "string", "tasks": ["task1", "task2"] },
    { "day": 7, "focus": "string", "tasks": ["task1", "task2"] }
  ],
  "summary": "2-3 sentence overall assessment"
}

Return ONLY valid JSON.`;

  try {
    const text = await callAI(prompt, null, true);
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Feedback report generation failed:', e);
    return getDefaultReport(sessionData);
  }
}

function getDefaultReport(data) {
  return {
    overallScore: 65,
    categoryScores: {
      communication: 60,
      bodyLanguage: data.postureAvg || 70,
      answerQuality: 60,
      confidence: data.eyeContactAvg || 65,
      engagement: 65,
    },
    strengths: [
      { title: 'Willingness to Practice', detail: 'You completed a full mock interview session.' },
      { title: 'Consistent Presence', detail: 'You maintained camera engagement throughout.' },
    ],
    weaknesses: [
      { title: 'Filler Words', detail: `Used ${data.totalFillers || 0} filler words. Aim for zero.` },
      { title: 'Answer Depth', detail: 'Try using the STAR method for more structured responses.' },
    ],
    actionItems: [
      'Practice the STAR method for behavioral answers',
      'Record yourself to reduce filler words',
      'Maintain consistent eye contact with the camera',
      'Sit upright with shoulders back during video calls',
      'Prepare 3 specific project examples with metrics',
    ],
    sevenDayPlan: [
      { day: 1, focus: 'Self-Awareness', tasks: ['Watch your recording', 'Count filler words'] },
      { day: 2, focus: 'STAR Method', tasks: ['Write 5 STAR stories', 'Practice one aloud'] },
      { day: 3, focus: 'Body Language', tasks: ['Practice posture for 10 min', 'Record yourself speaking'] },
      { day: 4, focus: 'Technical Prep', tasks: ['Review top 10 questions for your role', 'Time your answers'] },
      { day: 5, focus: 'Mock Interview', tasks: ['Do another mock with a tough persona', 'Focus on one weakness'] },
      { day: 6, focus: 'Confidence', tasks: ['Power pose exercise', 'Practice eye contact with camera'] },
      { day: 7, focus: 'Full Rehearsal', tasks: ['Complete end-to-end mock', 'Compare scores with Day 1'] },
    ],
    summary: 'You completed a mock interview session. Focus on reducing filler words and adding specific examples with metrics to your answers.',
  };
}
