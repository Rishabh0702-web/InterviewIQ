import { callAI } from '../utils/aiClient';

/**
 * Generate personalized interview questions based on JD and gap analysis.
 * @param {Object} jdData - Parsed job description data
 * @param {Object} gapData - Gap analysis results
 * @returns {Promise<Array>} - Array of question objects
 */
export async function callQuestionBankAgent(jdData, gapData) {
  const prompt = `You are an expert Interview Question Generation AI Agent. Based on the job description analysis and resume gap analysis, generate a comprehensive set of personalized interview questions.

Job Description Data:
${JSON.stringify(jdData, null, 2)}

Gap Analysis:
${JSON.stringify(gapData, null, 2)}

  Generate 12-15 questions divided into these categories:

1. **Technical** (5-6 questions): Based on required skills, with focus on gap areas
2. **Behavioral** (3-4 questions): STAR format questions targeting soft skills
3. **Situational** (2-3 questions): Scenario-based questions relevant to the role
4. **Culture-fit** (2 questions): Based on company culture signals

Return a JSON object with a single "questions" array, where each question object has:
{
  "questions": [
    {
      "id": number (unique sequential),
      "category": "Technical" | "Behavioral" | "Situational" | "Culture-fit",
      "question": "string",
      "difficulty": "Easy" | "Medium" | "Hard",
      "intentBehind": "What the interviewer is looking for",
      "idealAnswerHints": ["2-3 key points to cover in the answer"],
      "relatedSkill": "the skill being tested",
      "isGapRelated": boolean (true if this targets a gap area)
    }
  ]
}

IMPORTANT: Return ONLY a valid JSON object, no markdown, no code blocks, no explanation.`;

  const text = await callAI(prompt, null, true);
  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    const data = JSON.parse(cleaned);
    return data.questions || [];
  } catch (e) {
    console.error('Failed to parse questions response:', text);
    throw new Error('Failed to generate questions. Please try again.');
  }
}
