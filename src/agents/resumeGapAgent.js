import { callAI } from '../utils/aiClient';

/**
 * Analyze gaps between resume and job description.
 * @param {string} resumeText - Extracted text from resume PDF
 * @param {Object} jdData - Parsed job description data
 * @returns {Promise<Object>} - Gap analysis results
 */
export async function callResumeGapAgent(resumeText, jdData) {
  const prompt = `You are an expert Resume Gap Analysis AI Agent. Compare the candidate's resume with the job description requirements and provide a detailed gap analysis.

Job Description Data:
${JSON.stringify(jdData, null, 2)}

Candidate Resume:
${resumeText}

Return a JSON object with these fields:
{
  "overallMatch": number (0-100, percentage match score),
  "strengths": [
    {
      "skill": "string",
      "evidence": "brief quote or reason from resume",
      "relevance": "high/medium"
    }
  ],
  "gaps": [
    {
      "skill": "string",
      "importance": "critical/important/nice-to-have",
      "suggestion": "how to address this gap"
    }
  ],
  "neutralSkills": [
    {
      "skill": "string",
      "note": "partially mentioned or tangentially related"
    }
  ],
  "experienceMatch": {
    "required": "string",
    "candidate": "string",
    "verdict": "strong match/partial match/gap"
  },
  "topRecommendations": [
    "Top 3-5 actionable recommendations to strengthen candidacy"
  ],
  "interviewFocusAreas": [
    "Areas the interviewer is likely to probe based on gaps"
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

  const text = await callAI(prompt, null, true);
  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse gap analysis response:', text);
    throw new Error('Failed to analyze resume gaps. Please try again.');
  }
}
