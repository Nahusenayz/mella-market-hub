const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const apiKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('VITE_OPENROUTER_API_KEY');

    if (!apiKey) {
      return json({ error: 'Missing OPENROUTER_API_KEY' }, 500);
    }

    const messages: Message[] = Array.isArray(body.messages) ? body.messages : [];
    const model = typeof body.model === 'string' && body.model.trim() ? body.model : DEFAULT_MODEL;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.get('origin') ?? 'https://mella.market',
        'X-Title': 'Mella Market Hub',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return json(
        {
          error: data?.error?.message || 'OpenRouter request failed',
          raw: data,
        },
        response.status
      );
    }

    return json({
      text: data?.choices?.[0]?.message?.content || '',
      raw: data,
    });
  } catch (error) {
    console.error('AI proxy error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Proxy error',
      },
      500
    );
  }
});
