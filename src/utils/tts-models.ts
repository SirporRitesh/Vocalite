// src/utils/tts-models.ts
// TTS Model configurations for different voices

export interface TTSModelConfig {
  name: string;
  modelUrl: string;
  configUrl: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  quality: 'low' | 'medium' | 'high';
  size: string;
}

export const TTS_MODELS: Record<string, TTSModelConfig> = {
  'lessac-medium': {
    name: 'Lessac (Medium)',
    modelUrl: '/models/tts/en_US-lessac-medium.onnx',
    configUrl: '/models/tts/en_US-lessac-medium.onnx.json',
    description: 'Clear, professional male voice with good quality',
    gender: 'male',
    quality: 'medium',
    size: '~63MB'
  },
  'amy-medium': {
    name: 'Amy (Medium)',
    modelUrl: '/models/tts/en_US-amy-medium.onnx',
    configUrl: '/models/tts/en_US-amy-medium.onnx.json',
    description: 'Natural female voice, good for conversations',
    gender: 'female',
    quality: 'medium',
    size: '~63MB'
  },
  'ryan-medium': {
    name: 'Ryan (Medium)',
    modelUrl: '/models/tts/en_US-ryan-medium.onnx',
    configUrl: '/models/tts/en_US-ryan-medium.onnx.json',
    description: 'Warm male voice with natural intonation',
    gender: 'male',
    quality: 'medium',
    size: '~63MB'
  },
  'libritts-high': {
    name: 'LibriTTS (High)',
    modelUrl: '/models/tts/en_US-libritts-high.onnx',
    configUrl: '/models/tts/en_US-libritts-high.onnx.json',
    description: 'High-quality multi-speaker model',
    gender: 'neutral',
    quality: 'high',
    size: '~100MB'
  }
};

export const DEFAULT_MODEL = 'lessac-medium';

export function getModelConfig(modelKey?: string): TTSModelConfig {
  return TTS_MODELS[modelKey || DEFAULT_MODEL] || TTS_MODELS[DEFAULT_MODEL];
}

export function getAllModels(): TTSModelConfig[] {
  return Object.values(TTS_MODELS);
}

export function getModelsByGender(gender: 'male' | 'female' | 'neutral'): TTSModelConfig[] {
  return getAllModels().filter(model => model.gender === gender);
}

export function getModelsByQuality(quality: 'low' | 'medium' | 'high'): TTSModelConfig[] {
  return getAllModels().filter(model => model.quality === quality);
}
