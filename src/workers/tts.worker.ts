// src/workers/tts.worker.ts - TTS Web Worker with browser fallback
// Note: Piper TTS is disabled until WASM files are properly set up

let isReady = false;
let availableVoices: string[] = [];
let useFallback = false;

// Helper function to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

self.onmessage = async (event) => {
  const { type, text, voiceId } = event.data;

  try {
    if (type === 'INIT') {
      console.log('TTS Worker: Initializing...');
      
      // For now, skip Piper TTS initialization and go directly to browser fallback
      // since the required WASM files are not available in this setup
      
      try {
        // Check if the model file exists (optional - for future Piper TTS support)
        const modelPath = '/models/tts/en_US-lessac-medium.onnx';
        const modelCheck = await fetch(modelPath, { method: 'HEAD' });
        
        if (modelCheck.ok) {
          console.log('TTS Worker: Model file found, but WASM files missing. Using browser fallback.');
        } else {
          console.log('TTS Worker: No model files found. Using browser fallback.');
        }
        
        // Always fallback to browser TTS for now
        throw new Error('Piper TTS WASM files not available - using browser fallback');
        
      } catch (err) {
        console.log('TTS Worker: Falling back to browser TTS -', getErrorMessage(err));
        
        // Immediate fallback to browser TTS
        useFallback = true;
        isReady = true;
        availableVoices = ['browser-speech-synthesis'];
        
        // Ensure we always send the READY message
        self.postMessage({ 
          type: 'READY', 
          voiceId: 'browser-speech-synthesis',
          fallbackToMainThread: true
        });
        
        self.postMessage({ 
          type: 'VOICES', 
          voices: availableVoices,
          fallbackToMainThread: true
        });
        
        console.log('TTS Worker: Fallback initialization complete');
      }
    }

    if (type === 'SPEAK') {
      if (!isReady) {
        self.postMessage({ type: 'ERROR', message: 'Worker not ready for SPEAK' });
        return;
      }
      if (!text || !text.trim()) {
        self.postMessage({ type: 'ERROR', message: 'No text provided' });
        return;
      }

      try {
        // Since we're in fallback mode, always use browser TTS
        console.log('TTS Worker: Using browser TTS fallback');
        
        self.postMessage({ 
          type: 'SPEAK_REQUEST', 
          text: text.trim(),
          voiceId: voiceId || 'browser-speech-synthesis',
          fallbackToMainThread: true
        });
        
      } catch (err) {
        console.error('TTS generation error:', getErrorMessage(err));
        self.postMessage({ 
          type: 'SPEAK_REQUEST', 
          text: text.trim(),
          voiceId: 'browser-speech-synthesis',
          fallbackToMainThread: true
        });
      }
    }

    if (type === 'GET_VOICES') {
      try {
        self.postMessage({ 
          type: 'VOICES', 
          voices: availableVoices,
          fallbackToMainThread: useFallback
        });
      } catch (err) {
        console.error('Get voices error:', err);
        self.postMessage({ type: 'ERROR', message: `Get voices error: ${getErrorMessage(err)}` });
      }
    }

    if (type === 'STOP') {
      console.log('TTS Worker: Stop requested');
      self.postMessage({ 
        type: 'STOP_REQUEST',
        fallbackToMainThread: true
      });
    }
    
  } catch (err) {
    console.error('TTS Worker exception:', err);
    self.postMessage({ type: 'ERROR', message: getErrorMessage(err) });
  }
};