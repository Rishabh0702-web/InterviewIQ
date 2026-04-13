import { callAI, callAIWithHistory } from '../utils/aiClient';

export const PERSONAS = {
  friendly: {
    id: 'friendly',
    name: 'Friendly HR',
    color: '#1a8a4a',
    description: 'Warm and encouraging. Focuses on culture fit, motivation, and behavioral questions.',
    systemPrompt: `You are a friendly, warm HR interviewer. You put candidates at ease, ask behavioral questions, and focus on culture fit and motivation. You're encouraging but still thorough. You occasionally give positive feedback during the interview. Keep responses under 3 sentences.`,
  },
  technical: {
    id: 'technical',
    name: 'Technical Lead',
    color: '#d42a2a',
    description: 'Deep technical focus. Probes architecture decisions, coding patterns, and problem-solving.',
    systemPrompt: `You are a senior technical lead conducting a technical interview. You dig deep into architecture decisions, coding patterns, and problem-solving approaches. You ask follow-up questions to test depth of knowledge. You're fair but rigorous. Keep responses under 3 sentences.`,
  },
  aggressive: {
    id: 'aggressive',
    name: 'Tough Manager',
    color: '#e8740a',
    description: 'Challenging and direct. Stress-tests with rapid-fire questions and pushback.',
    systemPrompt: `You are a tough, aggressive hiring manager. You challenge every answer, ask rapid-fire follow-ups, and look for inconsistencies. You're skeptical and direct. You push candidates to think on their feet. You occasionally say things like "That doesn't convince me" or "Can you do better?". Keep responses under 3 sentences.`,
  },
  panel: {
    id: 'panel',
    name: 'Panel Interview',
    color: '#111111',
    description: 'Mixed panel with varied question styles. Simulates real panel dynamics.',
    systemPrompt: `You are simulating a panel interview with 3 interviewers. Alternate between technical questions, behavioral questions, and situational questions. Sometimes reference what a "colleague" on the panel asked earlier. Be professional and structured. Keep responses under 3 sentences.`,
  },
};

/**
 * Generate interviewer response based on persona and conversation history.
 */
export async function getPersonaResponse(personaId, history, context = {}) {
  const persona = PERSONAS[personaId] || PERSONAS.friendly;

  const industryPrompt = context.industryFocus && context.industryFocus !== 'General'
    ? `\nIndustry Focus: ${context.industryFocus}. Tailor your questions heavily to this context. 
      If 'SDE - India', focus on Java/Spring, typical TCS/Infosys puzzles, and OOPs.
      If 'FAANG', ask extremely grueling data structure, strict algorithmic optimizations, and highly scalable system designs.
      If 'Startup', focus on product sense, shipping fast, building minimum viable products, and working with ambiguity.
      If 'Finance', ask about concurrency, low-latency execution, or strict risk compliance patterns.
      If 'ML/AI', focus on model architecture, data pipelines, transformers, and deployment constraints.`
    : '';

  const systemPrompt = `${persona.systemPrompt}${industryPrompt}

${context.jdData ? `Job being interviewed for: ${context.jdData.jobTitle || 'Software Engineer'} at ${context.jdData.company || 'a tech company'}.` : ''}
${context.questions?.length ? `You have these prepared questions to choose from (pick the most relevant next): ${context.questions.slice(0, 5).map(q => q.question).join(' | ')}` : ''}

Rules:
- Ask ONE question at a time
- If the candidate's answer is weak or vague, follow up with "Can you elaborate?" or "Give me a specific example"
- Keep your responses concise — under 3 sentences
- Don't repeat questions already asked
- After 5-6 questions, start wrapping up naturally`;

  const messages = history.map(msg => ({
    role: msg.role === 'interviewer' ? 'assistant' : 'user',
    content: msg.content,
  }));

  // If conversation just started, ask the first question
  if (history.length === 0) {
    messages.push({ role: 'user', content: 'Start the interview. Introduce yourself briefly and ask the first question.' });
  }

  try {
    return await callAIWithHistory(systemPrompt, messages);
  } catch (e) {
    console.error('Persona agent error:', e);
    return "I appreciate your answer. Let's move on — tell me about a challenging project you've worked on recently.";
  }
}

/**
 * Generate a whisper coaching tip based on the last answer.
 */
export async function getWhisperCoachTip(answer, question = '') {
  const prompt = `You are a secret interview coach whispering tips to a candidate during a live interview. The candidate just answered a question.

Question: "${question}"
Answer: "${answer}"

Give ONE short, actionable tip (under 15 words) to improve their next answer. Be specific and helpful.
Examples: "Add a metric — what % improvement did you achieve?" or "Use STAR method: describe the specific Result"

Return ONLY the tip text, nothing else.`;

  try {
    return await callAI(prompt);
  } catch (e) {
    return 'Add specific metrics or examples to strengthen your answer.';
  }
}
