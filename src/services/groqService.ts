
export const askMellaAssistant = async (prompt: string, history: { role: string; content: string }[] = []) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error("OpenRouter API key is missing. Please set VITE_OPENROUTER_API_KEY in .env.local");
    return "I'm sorry, my AI brain is not connected right now. Please check the API key.";
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin, // Optional, for OpenRouter rankings
        "X-Title": "Mella Market Hub", // Optional
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.1-8b-instruct", // Fast and capable
        "messages": [
          {
            "role": "system",
            "content": `You are Mella AI, a helpful, friendly, and culturally intelligent assistant for Mella Market Hub in Ethiopia. 
            - You speak both Amharic and English fluently.
            - You understand Ethiopian culture, holidays, and specific locations in Addis Ababa and other cities.
            - You help users find services (plumbers, mechanics, etc.) or products.
            - Keep your responses concise and helpful.
            - If asked in Amharic, respond in Amharic. If asked in English, respond in English.`
          },
          ...history,
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";
  } catch (error) {
    console.error("Error calling OpenRouter/Groq:", error);
    return "Connection error. Please check your internet and try again.";
  }
};
