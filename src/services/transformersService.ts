
import { classifyEmergency } from './groqService';

type PipelineFn = (text: string) => Promise<Array<{ label: string; score: number }>>;

let pipeline: PipelineFn | null = null;
let modelLoading = false;
let modelReady = false;

const MODEL_NAME = 'Xenova/bert-base-multilingual-uncased-sentiment';

export const isTransformersSupported = (): boolean => {
  try {
    return !!navigator.hardwareConcurrency || !!WebAssembly;
  } catch {
    return false;
  }
};

export const getModelStatus = () => ({
  loading: modelLoading,
  ready: modelReady,
  supported: isTransformersSupported(),
});

const loadPipeline = async () => {
  if (pipeline) return pipeline;
  if (modelLoading) return null;
  modelLoading = true;
  try {
    const { pipeline: pipe } = await import('@huggingface/transformers');
    pipeline = await pipe('text-classification', MODEL_NAME, {
      quantized: true,
      progress_callback: (progress: { status: string }) => {
        if (progress.status === 'done') {
          modelReady = true;
          modelLoading = false;
        }
      },
    });
    modelReady = true;
    modelLoading = false;
    return pipeline;
  } catch (e) {
    console.warn('Transformers.js model load failed, will use online fallback:', e);
    modelLoading = false;
    return null;
  }
};

export const initOfflineAI = async () => {
  if (!isTransformersSupported()) return false;
  await loadPipeline();
  return modelReady;
};

export const classifyEmergencyOffline = async (details: string, language: string = 'en') => {
  if (!modelReady || !pipeline) {
    return classifyEmergency(details, language);
  }
  try {
    const result = await pipeline(details);
    const label = result?.[0]?.label || '';
    const urgencyMap: Record<string, string> = {
      'POSITIVE': 'Normal',
      'NEGATIVE': 'Critical',
      'NEUTRAL': 'High',
    };
    return {
      category: null,
      urgency: urgencyMap[label] || 'Normal',
      raw: result,
    };
  } catch {
    return classifyEmergency(details, language);
  }
};

export const translateOffline = async (text: string, targetLang: 'en' | 'am') => {
  if (!modelReady || !pipeline) {
    const { translateWithMella } = await import('./groqService');
    return translateWithMella(text, targetLang);
  }
  // Simple offline fallback: return text as-is if model not ready for translation
  return `[Offline] Translate to ${targetLang === 'am' ? 'Amharic' : 'English'}: ${text}`;
};
