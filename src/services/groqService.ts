
type ChatMessage = { role: string; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct";

const callOpenRouter = async (systemPrompt: string, prompt: string, history: ChatMessage[] = []) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OpenRouter API key is missing. Please set VITE_OPENROUTER_API_KEY in .env.local");
    return "I'm sorry, my AI brain is not connected right now. Please check the API key.";
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Mella Market Hub",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    return "Connection error. Please check your internet and try again.";
  }
};

export const askMellaAssistant = async (prompt: string, history: ChatMessage[] = []) => {
  return callOpenRouter(
    `You are Mella AI, a helpful, friendly, and culturally intelligent assistant for Mella Market Hub in Ethiopia.
    - You MUST respond in English ONLY, regardless of the language of the user's question.
    - You understand Ethiopian culture, holidays, and specific locations in Addis Ababa and other cities.
    - You help users find services (plumbers, mechanics, etc.) or products.
    - Keep your responses concise and helpful.
    - If a user asks an emergency-related question, answer clearly with specific numbers and instructions.`,
    prompt,
    history
  );
};

export const classifyEmergency = async (details: string, language: string = 'en') => {
  const prompt = language === 'am'
    ? `የሚከተለውን የአደጋ ጊዜ መግለጫ ተንትን። ምድብ (police|ambulance|fire_truck|traffic_police|tow_truck) እና የአስቸኳይ ጊዜ ደረጃ (Critical|High|Normal) መልስ። ቅርጸት፦ CATEGORY: police | URGENCY: Critical`
    : `Analyze this emergency description. Return the category (police|ambulance|fire_truck|traffic_police|tow_truck) and urgency level (Critical|High|Normal). Format: CATEGORY: police | URGENCY: Critical\n\nDescription: ${details}`;
  const result = await callOpenRouter(
    'You are an emergency triage AI. Analyze descriptions and classify them into categories and urgency levels. Respond ONLY in the requested format.',
    prompt
  );
  const catMatch = result.match(/CATEGORY:\s*(\w+)/i);
  const urgMatch = result.match(/URGENCY:\s*(\w+)/i);
  return {
    category: catMatch?.[1]?.toLowerCase() || null,
    urgency: urgMatch?.[1] || null,
    raw: result
  };
};

export const translateWithMella = async (
  text: string,
  targetLanguage: 'en' | 'am',
  history: ChatMessage[] = []
) => {
  return callOpenRouter(
    `You are Mella Translate. Translate the user's text accurately and naturally.
    - Preserve meaning, names, prices, and addresses.
    - Return only the translated text, with no explanation.
    - Target language is ${targetLanguage === 'am' ? 'Amharic' : 'English'}.`,
    text,
    history
  );
};
