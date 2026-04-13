import { callAI } from '../utils/aiClient';

/**
 * Parse a job description into structured data using Grok AI.
 * @param {string} jdText - The raw job description text
 * @returns {Promise<Object>} - Structured JD data
 */
export async function callJDParserAgent(jdText) {
  const prompt = `You are an expert Job Description Parser AI Agent. Analyze the following job description and extract structured information.

Return a JSON object with these fields:
{
  "jobTitle": "string",
  "company": "string or 'Not specified'",
  "roleType": "one of: Full-time, Part-time, Contract, Internship, Remote",
  "experienceLevel": "one of: Entry, Mid, Senior, Lead, Principal",
  "requiredSkills": ["array of required technical skills"],
  "preferredSkills": ["array of preferred/nice-to-have skills"],
  "softSkills": ["array of soft skills mentioned"],
  "responsibilities": ["array of key responsibilities"],
  "qualifications": ["array of required qualifications"],
  "companyCulture": ["array of culture signals, values, or work environment clues"],
  "salaryRange": "string or 'Not specified'",
  "keywords": ["important keywords for interview preparation"]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.

Job Description:
${jdText}`;

  const text = await callAI(prompt, null, true);
  const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse JD response:', text);
    throw new Error('Failed to parse job description. Please try again.');
  }
}
