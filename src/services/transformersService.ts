import { classifyEmergency } from './groqService';
import { classifyEmergencyLocally, translateOfflineText } from './offlineLanguage';

let modelLoading = false;
let modelReady = false;

export const isTransformersSupported = (): boolean => {
  try {
    return !!navigator.hardwareConcurrency || !!window.WebAssembly;
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
  if (modelLoading) return null;
  modelLoading = true;
  modelReady = true;
  modelLoading = false;
  return null;
};

export const initOfflineAI = async () => {
  if (!isTransformersSupported()) return false;
  await loadPipeline();
  return modelReady;
};

export const classifyEmergencyOffline = async (details: string, language: string = 'en') => {
  try {
    const result = classifyEmergencyLocally(details);
    return {
      category: result.category,
      urgency: result.urgency,
      raw: {
        source: 'local-classifier',
        confidence: result.confidence,
      },
    };
  } catch {
    return classifyEmergency(details, language);
  }
};

export const translateOffline = async (text: string, targetLang: 'en' | 'am') => {
  if (!text.trim()) return '';
  const translated = translateOfflineText(text, targetLang);
  return translated || text;
};
