import { supabase } from '@/integrations/supabase/client';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AiTextRequest {
  systemPrompt: string;
  prompt: string;
  history?: ChatMessage[];
  model?: string;
}

export interface AiTextResponse {
  text: string;
  source: 'edge' | 'browser' | 'offline';
  error?: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct';

const buildMessages = (systemPrompt: string, prompt: string, history: ChatMessage[] = []): ChatMessage[] => [
  { role: 'system', content: systemPrompt },
  ...history,
  { role: 'user', content: prompt },
];

const runViaEdgeFunction = async (payload: AiTextRequest): Promise<AiTextResponse> => {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: payload.model ?? DEFAULT_MODEL,
      messages: buildMessages(payload.systemPrompt, payload.prompt, payload.history),
    },
  });

  if (error) {
    throw error;
  }

  if (typeof data === 'string') {
    return { text: data, source: 'edge' };
  }

  if (data?.text) {
    return {
      text: String(data.text),
      source: 'edge',
    };
  }

  throw new Error('Invalid response from AI proxy');
};

const runViaBrowserFallback = async (payload: AiTextRequest): Promise<AiTextResponse> => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      text: '',
      source: 'offline',
      error: 'OpenRouter API key is missing and the edge function is unavailable.',
    };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Mella Market Hub',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: payload.model ?? DEFAULT_MODEL,
      messages: buildMessages(payload.systemPrompt, payload.prompt, payload.history),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    source: 'browser',
  };
};

export const runAiText = async (payload: AiTextRequest): Promise<AiTextResponse> => {
  try {
    return await runViaEdgeFunction(payload);
  } catch (edgeError) {
    console.warn('AI edge function unavailable, using browser fallback:', edgeError);

    try {
      return await runViaBrowserFallback(payload);
    } catch (browserError) {
      console.error('AI browser fallback failed:', browserError);
      return {
        text: '',
        source: 'offline',
        error: browserError instanceof Error ? browserError.message : 'AI request failed',
      };
    }
  }
};
