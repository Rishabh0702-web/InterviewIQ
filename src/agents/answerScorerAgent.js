import { callAI } from '../utils/aiClient';

/**
 * Score an interview answer for quality.
 * @param {string} answer - The transcribed answer text
 * @param {string} question - The question being answered (optional)
 * @returns {Promise<Object>} - Score object
 */
export async function scoreAnswer(answer, question = '') {
  const prompt = `You are an expert Interview Answer Scorer. Evaluate this interview answer quickly.

${question ? `Question: ${question}` : 'Question: (general interview question)'}

Answer: "${answer}"

Score the answer on these dimensions (1-10 each):
1. Clarity: How clear and articulate is the communication?
2. Relevance: How well does it address the question?
3. Structure: Does it follow STAR method or logical structure?
4. Depth: Does it include specifics, metrics, or examples?
5. Confidence: Does the language convey confidence?

Return ONLY a JSON object:
{
  "clarity": number,
  "relevance": number,
  "structure": number,
  "depth": number,
  "confidence": number,
  "overall": number (average of all scores),
  "quickTip": "One sentence actionable tip to improve this answer"
}`;

  try {
    const text = await callAI(prompt, null, true);
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Answer scoring failed:', e);
    return {
      clarity: 5, relevance: 5, structure: 5, depth: 5, confidence: 5,
      overall: 5, quickTip: 'Keep practicing — detailed answers score higher.'
    };
  }
}
