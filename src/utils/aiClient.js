/**
 * Shared AI Client — Groq API (Llama 3)
 * Compatible with OpenAI chat completions format
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Updated to supported Groq model

function getApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROK_API_KEY; 
}

/**
 * Call Groq with a simple text prompt and get a text response.
 */
export async function callAI(prompt, messages = null, requireJson = false) {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('No Groq API key found. Add VITE_GROQ_API_KEY to your .env file.');
  }

  const body = {
    model: GROQ_MODEL,
    messages: messages || [{ role: 'user', content: prompt }],
    temperature: 0.7,
  };

  if (requireJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || response.statusText;
    throw new Error(`Groq API error ${response.status}: ${msg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Call Groq with a system prompt + user message
 */
export async function callAIWithHistory(systemPrompt, history = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];
  return callAI(null, messages);
}
