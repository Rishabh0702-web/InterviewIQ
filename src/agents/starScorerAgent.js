import { callAI } from '../utils/aiClient';

/**
 * Check if a question is behavioral (STAR-applicable).
 */
export function isSTARApplicable(question = '') {
  const behavioral = [
    'tell me about a time', 'describe a situation', 'give me an example',
    'when have you', 'have you ever', 'walk me through', 'how did you handle',
    'what did you do when', 'share an experience', 'describe how you',
  ];
  const q = question.toLowerCase();
  return behavioral.some((phrase) => q.includes(phrase));
}

/**
 * Score an answer against the STAR method.
 * Returns scores for each component + overall + tip.
 */
export async function scoreWithSTAR(answer, question = '') {
  const applicable = isSTARApplicable(question);

  // For non-behavioral questions, return a neutral result
  if (!applicable) {
    return {
      isApplicable: false,
      situation: { present: false, score: 0, note: null },
      task:      { present: false, score: 0, note: null },
      action:    { present: false, score: 0, note: null },
      result:    { present: false, score: 0, note: null },
      overallSTAR: 0,
      tip: null,
    };
  }

  const prompt = `You are an expert interview coach evaluating answers using the STAR method (Situation, Task, Action, Result).

Question: "${question}"
Answer: "${answer}"

Evaluate whether each STAR component is present and how well it's covered.

Return ONLY valid JSON:
{
  "situation": { "present": boolean, "score": number (0-10), "note": "brief note" },
  "task":      { "present": boolean, "score": number (0-10), "note": "brief note" },
  "action":    { "present": boolean, "score": number (0-10), "note": "brief note" },
  "result":    { "present": boolean, "score": number (0-10), "note": "brief note" },
  "overallSTAR": number (0-100),
  "tip": "One short tip to improve STAR structure (max 12 words)"
}`;

  try {
    const text = await callAI(prompt, null, true);
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const data = JSON.parse(cleaned);
    return { isApplicable: true, ...data };
  } catch (e) {
    console.error('STAR scoring failed:', e);
    return {
      isApplicable: true,
      situation: { present: false, score: 0, note: null },
      task:      { present: false, score: 0, note: null },
      action:    { present: false, score: 0, note: null },
      result:    { present: false, score: 0, note: null },
      overallSTAR: 0,
      tip: 'Use STAR: Situation → Task → Action → Result.',
    };
  }
}

