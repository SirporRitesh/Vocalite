// hooks/useTTS.ts - Updated to handle worker fallback and browser TTS
import { useEffect, useRef, useState, useCallback } from 'react';

type UseTTSProps = {
  debug?: boolean;
  autoInit?: boolean;
  preferredVoiceId?: string;
};

type VoiceList = string[];

type ProgressInfo = {
  loaded?: number;
  total?: number;
};

type TTSMessage =
  | { type: 'READY'; voiceId?: string; fallbackToMainThread?: boolean }
  | { type: 'DOWNLOAD_PROGRESS'; progress: ProgressInfo }
  | { type: 'AUDIO'; buffer: ArrayBuffer }
  | { type: 'ERROR'; message: string }
  | { type: 'VOICES'; voices: VoiceList; fallbackToMainThread?: boolean }
  | { type: 'VOICE_CHANGED'; voiceId: string }
  | { type: 'REMOVED' }
  | { type: 'STOPPED' }
  | { type: 'SPEAK_REQUEST'; text: string; voiceId: string; fallbackToMainThread?: boolean }
  | { type: 'VOICES_REQUEST'; fallbackToMainThread?: boolean }
  | { type: 'STOP_REQUEST'; fallbackToMainThread?: boolean };

export function useTTS({ 
  debug = false, 
  autoInit = true, 
  preferredVoiceId 
}: UseTTSProps = {}) {
  const workerRef = useRef<Worker | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsActuallyStarted = useRef(false);
  const hasSpokenResponse = useRef(false); // <-- Add this ref
  
  // These are the states that should be properly managed
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // This should be separate from isInitialized
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [latencies, setLatencies] = useState<{ tts: number }>({ tts: 0 });
  const [availableVoices, setAvailableVoices] = useState<VoiceList>([]);
  const [currentVoiceId, setCurrentVoiceId] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Initialize browser speech synthesis voices
  const getBrowserVoices = (): SpeechSynthesisVoice[] => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  };

 const speakWithBrowser = useCallback((text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('🎤 speakWithBrowser called with text length:', text.length);
    
    if (!window.speechSynthesis) {
      console.log('❌ Speech synthesis not supported');
      return reject(new Error('Speech synthesis not supported'));
    }
    
    const startSpeech = async () => {
      // 🔧 ONLY cancel if something else is actually speaking
      console.log('🧹 Checking speech synthesis state...');
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.log('⚠️ Something else is speaking, canceling first...');
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('✅ Speech synthesis is clean, proceeding...');
      }
      
      // Force resume if paused
      if (window.speechSynthesis.paused) {
        console.log('🔄 Resuming paused speech synthesis...');
        window.speechSynthesis.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 🔧 REPLACE THIS ENTIRE SECTION:
      // Wait for voices AND ensure they're actually usable
      const ensureVoicesReady = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const voices = window.speechSynthesis.getVoices();
          console.log(`🎵 Voice check attempt ${attempts + 1}: ${voices.length} voices`);
          
          if (voices.length > 0) {
            // Test if voices are actually usable by trying a quick utterance
            try {
              const testUtterance = new SpeechSynthesisUtterance('');
              testUtterance.voice = voices[0];
              // If this doesn't throw, voices are ready
              console.log('✅ Voices are ready for use');
              return voices;
            } catch (e) {
              console.log('⚠️ Voices not ready yet, waiting...');
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        console.log('⚠️ Voice loading timeout, using whatever is available');
        return window.speechSynthesis.getVoices();
      };

      // Replace the voice loading section with:
      const voices = await ensureVoicesReady();
      // 🔧 END REPLACEMENT
      
      console.log('🚀 Starting speech synthesis...');
      
      const utterance = new SpeechSynthesisUtterance(text);
      const startTime = performance.now();
      
      // Voice configuration - use the voices from ensureVoicesReady
      const preferred = voices.find(v => 
        v.lang === 'en-US' && v.localService && 
        (v.name.includes('Microsoft') || v.name.includes('Google'))
      ) || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      
      if (preferred) {
        console.log('🎵 Selected voice:', preferred.name, preferred.lang);
        utterance.voice = preferred;
      }
      
      utterance.rate = 0.9; // Slightly faster for better reliability
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      let hasStarted = false;
      let hasEnded = false;
      let startTimeout: NodeJS.Timeout;
      
      utterance.onstart = () => {
        console.log('✅ Browser TTS actually started speaking!');
        hasStarted = true;
        clearTimeout(startTimeout);
        setIsSpeaking(true);
        ttsActuallyStarted.current = true;
        hasSpokenResponse.current = true;
      };
      
      // 🔧 ADD THIS: Force the browser to "wake up" speech synthesis
      const forceSpeechStart = () => {
        // Create a tiny silent utterance first to "prime" the speech synthesis
        const primer = new SpeechSynthesisUtterance('');
        primer.volume = 0;
        primer.rate = 10;
        primer.onend = () => {
          console.log('🎯 Primer utterance ended, starting real speech...');
          
          // Now speak the real utterance
          speechSynthRef.current = utterance;
          window.speechSynthesis.speak(utterance);
          console.log('🎯 speechSynthesis.speak() called successfully');
        };
        
        // Speak the primer first
        window.speechSynthesis.speak(primer);
      };
      
      // Replace the existing speak call with:
      try {
        // First try the normal way
        speechSynthRef.current = utterance;
        console.log('🎯 About to call speechSynthesis.speak()...');
        
        // Before calling speechSynthesis.speak(), add these workarounds:
        // 🔧 Browser-specific fixes
        const applyBrowserFixes = () => {
          // Chrome/Edge fix: pause and resume
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          
          // Firefox fix: set rate after voice
          if (preferred) {
            utterance.voice = preferred;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
          }
          
          // Safari fix: add small delay
          return new Promise(resolve => setTimeout(resolve, 50));
        };

        // Use it before speaking:
        await applyBrowserFixes();
        window.speechSynthesis.speak(utterance);
        console.log('🎯 speechSynthesis.speak() called successfully');
        
        // Set timeout to detect if speech never starts
        startTimeout = setTimeout(() => {
          if (!hasStarted && !hasEnded) {
            console.log('⚠️ Speech failed to start, trying primer method...');
            window.speechSynthesis.cancel();
            
            setTimeout(() => {
              forceSpeechStart();
            }, 100);
            
            // Final timeout
            setTimeout(() => {
              if (!hasStarted && !hasEnded) {
                console.log('❌ Speech completely failed after primer attempt');
                hasEnded = true;
                setIsSpeaking(false);
                
                // Release TTS lock
                if (typeof window !== 'undefined' && (window as any).isTTSLocked) {
                  (window as any).isTTSLocked.current = false;
                  console.log('🔓 Released TTS lock due to speech failure');
                }
                
                resolve();
              }
            }, 3000);
          }
        }, 1000); // Reduced timeout for faster retry
        
      } catch (error) {
        console.log('❌ Error calling speechSynthesis.speak():', error);
        setIsSpeaking(false);
        clearTimeout(startTimeout);
        reject(error);
      }
    };
    
    startSpeech();
  });
}, [debug]);


  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../workers/tts.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle worker messages
    workerRef.current.onmessage = (e: MessageEvent<TTSMessage>) => {
      const msg = e.data;
      
      switch (msg.type) {
        case 'READY':
          console.log('✅ TTS Hook: Setting initialized to true. Fallback:', msg.fallbackToMainThread);
          setIsInitialized(true);
          setIsLoading(false);
          
          // ✅ Properly set useFallback when fallback is indicated
          if (msg.fallbackToMainThread) {
            console.log('🔄 Setting useFallback to true');
            setUseFallback(true);
            // Initialize browser voices
            const browserVoices = getBrowserVoices();
            if (browserVoices.length === 0) {
              // Wait for voices to load
              window.speechSynthesis.addEventListener('voiceschanged', () => {
                const voices = getBrowserVoices().map(v => v.name);
                setAvailableVoices(voices);
                setCurrentVoiceId(voices[0] || 'default');
              });
            } else {
              const voices = browserVoices.map(v => v.name);
              setAvailableVoices(voices);
              setCurrentVoiceId(voices[0] || 'default');
            }
          }
          break;

        case 'SPEAK_REQUEST':
          if (msg.fallbackToMainThread) {
            speakWithBrowser(msg.text).catch(err => {
              // Only set error if it's not an interruption
              if (!err.message.includes('interrupted') && !err.message.includes('canceled')) {
                setError(`Browser TTS error: ${err.message}`);
              }
            });
          }
          break;

        case 'VOICES_REQUEST':
          if (msg.fallbackToMainThread) {
            const voices = getBrowserVoices().map(v => v.name);
            setAvailableVoices(voices);
          }
          break;

        case 'STOP_REQUEST':
          if (msg.fallbackToMainThread && window.speechSynthesis) {
            setError(null); // Clear errors when stopping
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
          }
          break;

        case 'STOPPED':
          setIsSpeaking(false);
          setError(null); // Clear errors when stopped
          if (debug) console.log('TTS stopped');
          break;

        case 'DOWNLOAD_PROGRESS':
          setProgress(msg.progress);
          break;

        case 'AUDIO': {
          setIsSpeaking(true);
          const blob = new Blob([msg.buffer], { type: 'audio/wav' });
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            setError('Audio playback failed');
          };
          audio.play().catch((err) => {
            setIsSpeaking(false);
            setError(`Audio play error: ${err.message}`);
          });
          break;
        }

        case 'ERROR':
          setError(msg.message);
          console.error('TTS Error:', msg.message);
          setIsSpeaking(false);
          break;

        case 'VOICES':
          if (!msg.fallbackToMainThread) {
            setAvailableVoices(msg.voices);
          }
          if (debug) console.log('Available voices:', msg.voices);
          break;

        case 'VOICE_CHANGED':
          setCurrentVoiceId(msg.voiceId);
          if (debug) console.log('Voice changed to:', msg.voiceId);
          break;

        case 'REMOVED':
          setCurrentVoiceId(null);
          setIsInitialized(false);
          if (debug) console.log('Model removed');
          break;
      }
    };

    // Auto initialize
    if (autoInit) {
      workerRef.current.postMessage({ 
        type: 'INIT', 
        voiceId: preferredVoiceId 
      });
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      workerRef.current?.terminate();
    };
  }, [autoInit, debug, preferredVoiceId, speakWithBrowser]);

  // In the speak function, add lock checking
  const speak = useCallback((text: string) => {
    console.log('🎯 speak() called with text:', text.substring(0, 50) + '...');
    console.log('🎯 TTS state - initialized:', isInitialized, 'useFallback:', useFallback, 'currently speaking:', isSpeaking);
    
    // Prevent multiple rapid calls
    if (isSpeaking) {
      console.log('⚠️ Already speaking, ignoring this call');
      return;
    }
    
    if (!isInitialized || !workerRef.current) {
      console.log('❌ TTS not initialized or no worker');
      setError('TTS not initialized');
      return;
    }
    
    setError(null);
    
    if (useFallback) {
      console.log('🔊 Using browser TTS fallback');
      setIsSpeaking(true);
      
      speakWithBrowser(text).catch(err => {
        console.log('❌ Browser TTS error:', err.message);
        setIsSpeaking(false);
        if (!err.message.includes('interrupted') && !err.message.includes('canceled')) {
          setError(`TTS error: ${err.message}`);
        }
      }).finally(() => {
        // Release the lock when TTS completes or fails
        if (typeof window !== 'undefined' && (window as any).isTTSLocked) {
          (window as any).isTTSLocked.current = false;
        }
      });
    } else {
      console.log('🔊 Using worker TTS');
      setIsSpeaking(true);
      workerRef.current.postMessage({ type: 'SPEAK', text });
    }
  }, [isInitialized, useFallback, isSpeaking, speakWithBrowser]);

  // Improved stop function with better logging
  const stop = useCallback(() => {
    console.log('🛑 Stop requested, current state:', { 
      isSpeaking, 
      speechSynthSpeaking: window.speechSynthesis?.speaking,
      speechSynthPending: window.speechSynthesis?.pending 
    });
    
    // Only stop if we're actually speaking or pending
    if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      console.log('🛑 Actually stopping speech synthesis');
      window.speechSynthesis.cancel();
    } else {
      console.log('⚠️ Stop called but no active speech to cancel');
    }
    
    if (speechSynthRef.current) {
      speechSynthRef.current = null;
    }
    
    setIsSpeaking(false);
    setError(null);
  }, [isSpeaking]);

  // Add direct test function (for debugging purposes)
  const testDirectTTS = () => {
    console.log('🧪 Direct TTS test (bypassing all our logic)');
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance("This is a direct test of text to speech");
      
      utterance.onstart = () => console.log('✅ Direct test: Speech started');
      utterance.onend = () => console.log('✅ Direct test: Speech ended');
      utterance.onerror = (e) => console.log('❌ Direct test error:', e.error);
      
      window.speechSynthesis.speak(utterance);
      console.log('🎯 Direct test: speak() called');
    }, 100);
  };

  const testBrowserTTS = useCallback(() => {
    console.log('🧪 Testing browser TTS directly');
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setTimeout(() => {
      const text = "This is a test of the browser's text-to-speech capabilities.";
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onstart = () => console.log('✅ Browser TTS test: Speech started');
      utterance.onend = () => console.log('✅ Browser TTS test: Speech ended');
      utterance.onerror = (e) => console.log('❌ Browser TTS test error:', e.error);
      
      // Use the preferred voice if available
      const voices = getBrowserVoices();
      const preferred = voices.find(v => 
        v.lang === 'en-US' && 
        (v.name.includes('Microsoft') || v.name.includes('Google') || v.localService)
      ) || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      
      if (preferred) {
        console.log('🎵 Browser TTS test: Selected voice:', preferred.name, preferred.lang, 'local:', preferred.localService);
        utterance.voice = preferred;
      } else {
        console.log('⚠️ Browser TTS test: No suitable voice found, using default');
      }
      
      window.speechSynthesis.speak(utterance);
      console.log('🎯 Browser TTS test: speak() called');
    }, 100);
  }, []);

  const getVoices = () => {
    if (useFallback) {
      const voices = getBrowserVoices().map(v => v.name);
      setAvailableVoices(voices);
    } else if (workerRef.current) {
      workerRef.current.postMessage({ type: 'GET_VOICES' });
    }
  };

  const changeVoice = (voiceId: string) => {
    if (!availableVoices.includes(voiceId)) {
      setError(`Voice ${voiceId} not available`);
      return;
    }
    setError(null);
    setCurrentVoiceId(voiceId);
    
    if (!useFallback && workerRef.current) {
      setIsInitialized(false);
      workerRef.current.postMessage({ type: 'CHANGE_VOICE', newVoiceId: voiceId });
    }
  };

  const initialize = async (voiceId?: string) => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'INIT', voiceId });
        
        // ✅ Reduce timeout and ensure faster fallback
        setTimeout(() => {
          if (!isInitialized) {
            console.log('TTS initialization timeout, falling back to browser TTS');
            setUseFallback(true);
            setIsInitialized(true);
            setIsLoading(false);
          }
        }, 2000); // ✅ Reduced from 5000ms to 2000ms
      }
    } catch (err) {
      console.error('TTS initialization error:', err);
      setError(`TTS initialization failed: ${err}`);
      setUseFallback(true);
      setIsInitialized(true);
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isInitialized,
    isSpeaking,
    error,
    progress,
    availableVoices,
    speak,
    stop,
    initialize,
    testBrowserTTS, // Add this line
  };
}