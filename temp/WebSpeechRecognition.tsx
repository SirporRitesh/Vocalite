// src/components/WebSpeechRecognition.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader, Volume2 } from "lucide-react";
import { useTTS } from "../hooks/useTTS";
import TextType from "@/components/ui/TextType";

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror:
      | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
      | null;
    onnomatch:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}

export default function WebSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [generatedResponse, setGeneratedResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const hasSpokenResponse = useRef(false);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const ttsActuallyStarted = useRef(false);
  const isTTSLocked = useRef(false); // Add at the top with other refs
  const autoSpeakAttempts = useRef(0); // Add this ref at the top

  // Initialize TTS with manual initialization for development compatibility
  const {
    isLoading: ttsLoading,
    isSpeaking,
    isInitialized: ttsInitialized,
    progress: ttsProgress,
    error: ttsError,
    availableVoices,
    speak,
    stop: stopSpeaking,
    initialize: initTTS,
    // testBrowserTTS, // Add this line
  } = useTTS({
    debug: true,
    autoInit: false, // Disable auto-init to manually control initialization
  });

  useEffect(() => {
    addDebugMessage("Initializing Voice Assistant...");

    // Check if Speech Recognition is supported
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      addDebugMessage("Web Speech API is supported");

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        addDebugMessage("Speech recognition started");
        setIsRecording(true);
        setError("");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscription((prev) => prev + finalTranscript);
          addDebugMessage(`Final transcript: ${finalTranscript}`);
        }

        setInterimTranscript(interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMsg = `Speech recognition error: ${event.error} - ${event.message}`;
        setError(errorMsg);
        addDebugMessage(errorMsg);
        setIsRecording(false);
      };

      recognition.onend = () => {
        addDebugMessage("Speech recognition ended");
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError("Web Speech API is not supported in this browser");
      addDebugMessage("Web Speech API not supported");
    }
  }, []);

  // Manual TTS initialization for development/production compatibility
  useEffect(() => {
    // Only initialize once
    if (ttsInitialized || ttsLoading) {
      return;
    }
    
    const initializeTTS = async () => {
      try {
        addDebugMessage("🚀 Starting manual TTS initialization...");
        
        // Try to initialize TTS with explicit model paths
        await initTTS('en_US-lessac-medium');
        
        addDebugMessage("✅ TTS manual initialization completed");
      } catch (error) {
        const errorMsg = `TTS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        addDebugMessage(`❌ ${errorMsg}`);
        console.warn('TTS initialization failed, will fallback to browser TTS:', error);
        
        // The hook should handle fallback automatically
      }
    };
    
    // Initialize TTS after component mounts
    const timer = setTimeout(() => {
      initializeTTS();
    }, 1000); // Small delay to ensure component is fully mounted
    
    return () => clearTimeout(timer);
  }, [initTTS, ttsInitialized, ttsLoading]);

  // Monitor TTS initialization
  useEffect(() => {
    console.log('🔍 TTS State Update - Loading:', ttsLoading, 'Initialized:', ttsInitialized, 'Error:', !!ttsError);
    if (ttsInitialized) {
      addDebugMessage("✅ TTS initialized successfully");
    } else if (ttsLoading) {
      addDebugMessage("🔄 TTS initializing...");
    }
  }, [ttsInitialized, ttsLoading, ttsError]);

  // Monitor TTS errors
  useEffect(() => {
    if (ttsError) {
      addDebugMessage(`❌ TTS Error: ${ttsError}`);
    }
  }, [ttsError]);

  // Monitor TTS progress
  useEffect(() => {
    if (ttsProgress?.loaded && ttsProgress?.total) {
      const pct = Math.round((ttsProgress.loaded / ttsProgress.total) * 100);
      addDebugMessage(`📥 TTS model download: ${pct}%`);
    } else if (ttsInitialized && !ttsProgress) {
      addDebugMessage("📦 TTS model loaded from cache");
    }
  }, [ttsProgress, ttsInitialized]);

  // Monitor available voices
  useEffect(() => {
    if (Object.keys(availableVoices).length > 0) {
      const voiceList = Object.keys(availableVoices).slice(0, 3).join(", ");
      addDebugMessage(`🎤 Available voices: ${voiceList}...`);
    }
  }, [availableVoices]);

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages((prev) => [
      ...prev.slice(-9),
      `[${timestamp}] ${message}`,
    ]);
    // Also log to console for easier debugging
    console.log(`[Voice Assistant] ${message}`);
  };

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        // Clear transcription states for a fresh start, but keep response for auto-speak
        setTranscription("");
        setInterimTranscript("");
        setError("");
        setIsGenerating(false);
        // Don't clear generated response until after auto-speak is done
        
        recognitionRef.current.start();
        addDebugMessage("Starting speech recognition...");
      } catch (error) {
        const errorMsg = `Failed to start recording: ${error}`;
        setError(errorMsg);
        addDebugMessage(errorMsg);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      addDebugMessage("Stopping speech recognition...");
    }
  };

  const clearTranscription = () => {
    setTranscription("");
    setInterimTranscript("");
    setGeneratedResponse("");
    setError("");
    addDebugMessage("Transcription cleared");
  };

  // Send transcription to Gemini with latency tracking
  const sendToGemini = useCallback(async () => {
    // ✅ Check TTS readiness before proceeding
    if (!ttsInitialized) {
      addDebugMessage("⚠️ Waiting for TTS initialization before generating response...");
      return;
    }

    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    const llmStartTime = performance.now();

    try {
      if (!transcription) {
        setError("No transcription to send");
        return;
      }

      setIsGenerating(true);
      setGeneratedResponse("");
      addDebugMessage("Sending transcription to Gemini...");

      const payload = {
        contents: [
          {
            parts: [
              {
                text: transcription.trim(),
              },
              {
                text: `Please respond to the above as a helpful assistant. 
                        Avoid using any special characters like *, -, ~, •, etc.
                        Do not format responses using bullet points, markdown, or emojis.
                        Reply in plain English and keep your answer under 300 words.`,
              },
            ],
          },
        ],
      };

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const generatedText = data?.candidates[0]?.content?.parts[0]?.text;

      const llmEndTime = performance.now();
      const llmLatency = llmEndTime - llmStartTime;

      if (generatedText) {
        setGeneratedResponse(generatedText);
        addDebugMessage(
          `✅ Generated response received (${llmLatency.toFixed(0)}ms)`
        );
      } else {
        throw new Error("No generated text received from Gemini");
      }
    } catch (error) {
      console.error("Error sending to Gemini:", error);
      setError(
        "Failed to generate response: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      addDebugMessage(
        "❌ Gemini API error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsGenerating(false);
    }
  }, [transcription, isRecording, ttsInitialized]);

useEffect(() => {
  // Trigger when user is recording and has paused for 3 seconds with some transcription
  if (isRecording && transcription.trim().length > 0 && !isGenerating && !generatedResponse) {
    const timer = setTimeout(() => {
      addDebugMessage("🤖 Auto-triggering AI response generation...");
      sendToGemini();
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [transcription, isRecording, isGenerating, generatedResponse]);

// Auto-speak the generated response
useEffect(() => {
  console.log('🔍 Auto-speak useEffect triggered');
  console.log('🔍 Auto-speak check:', {
    generatedResponse: !!generatedResponse,
    ttsInitialized,
    isSpeaking,
    hasSpoken: hasSpokenResponse.current,
    responseLength: generatedResponse?.trim().length
  });
  
  if (generatedResponse && 
      ttsInitialized && 
      !isSpeaking && 
      generatedResponse.trim().length > 0 && 
      !hasSpokenResponse.current) {
    
    console.log('✅ All conditions met for auto-speak');
    
    const speakTimer = setTimeout(() => {
      console.log("🔊 Auto-speaking AI response...");
      
      // 🔧 Circuit breaker: limit attempts
      if (autoSpeakAttempts.current >= 3) {
        console.log("🚫 Too many auto-speak attempts, giving up");
        hasSpokenResponse.current = true; // Mark as spoken to stop loop
        isTTSLocked.current = false; // Release lock
        return;
      }
      
      if (isTTSLocked.current) {
        console.log("🔒 TTS is locked, skipping auto-speak");
        return;
      }
      
      autoSpeakAttempts.current++;
      isTTSLocked.current = true;
      ttsActuallyStarted.current = false;
      hasSpokenResponse.current = true; // Prevent loops
      speak(generatedResponse);
    }, 300);
    
    return () => {
      console.log('🧹 Clearing auto-speak timer');
      clearTimeout(speakTimer);
    };
  } else {
    console.log('❌ Auto-speak conditions not met');
  }
}, [generatedResponse, ttsInitialized, isSpeaking]); // Removed 'speak' from dependencies

// Clear generated response after speaking is complete
useEffect(() => {
  // Only clear if we were speaking, now we're not, we have a response, we've spoken it, AND TTS actually started
  if (
    !isSpeaking &&
    generatedResponse &&
    generatedResponse.trim().length > 0 &&
    hasSpokenResponse.current &&
    ttsActuallyStarted.current // <-- Only clear if TTS actually started
  ) {
    const clearTimer = setTimeout(() => {
      setGeneratedResponse("");
      hasSpokenResponse.current = false;
      ttsActuallyStarted.current = false; // Reset for next time
      addDebugMessage("✨ Response spoken, cleared for next interaction");
    }, 1000);

    return () => clearTimeout(clearTimer);
  }
}, [isSpeaking, generatedResponse]);

// Reset the spoken flag when we start generating a new response
useEffect(() => {
  if (isGenerating) {
    hasSpokenResponse.current = false;
    autoSpeakAttempts.current = 0; // Reset attempt counter
    console.log('🔄 Reset hasSpokenResponse flag for new generation');
  }
}, [isGenerating]);

  // Enhanced stop function with debugging and guard
  const stop = useCallback(() => {
    console.log('🛑 Stop requested, current state:', { 
      isSpeaking, 
      speechSynthSpeaking: window.speechSynthesis?.speaking,
      speechSynthPending: window.speechSynthesis?.pending 
    });
    console.trace('🔍 Stop called from:'); // This will show the call stack
    
    // Only stop if we're actually speaking for more than 500ms
    if (isSpeaking && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
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

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Speech Recognition
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              Web Speech API is not supported in this browser. Please try using
              Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function testDirectTTS(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    if (!ttsInitialized) {
      addDebugMessage("⚠️ TTS is not initialized yet. Please wait...");
      return;
    }
    const testText = "This is a test of the text to speech system. If you hear this, TTS is working.";
    addDebugMessage("🧪 Speaking test phrase via TTS...");
    speak(testText);
  }

  
  function testBrowserTTS(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    
    // 🔒 Don't interfere if auto-speak is about to happen OR currently happening
    if (generatedResponse && !hasSpokenResponse.current) {
      addDebugMessage("⚠️ Auto-speak pending, skipping browser test");
      return;
    }
    
    if (isSpeaking) {
      addDebugMessage("⚠️ TTS is currently speaking, skipping browser test");
      return;
    }
    
    if (isTTSLocked.current) {
      addDebugMessage("⚠️ TTS is locked, skipping browser test");
      return;
    }
    
    // Check if voices are loaded
    const voices = window.speechSynthesis?.getVoices() || [];
    if (voices.length === 0) {
      addDebugMessage("⚠️ Voices not loaded yet, cannot test");
      return;
    }
    
    const testText = "This is a test of the browser's text to speech capability.";
    addDebugMessage("🔧 Testing browser TTS...");
    
    // 🔒 Lock TTS during test
    isTTSLocked.current = true;
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.onstart = () => addDebugMessage("▶️ Browser TTS test started");
      utterance.onend = () => {
        addDebugMessage("✅ Browser TTS test finished");
        isTTSLocked.current = false; // Release lock
      };
      utterance.onerror = (event) => {
        addDebugMessage(`❌ Browser TTS test error: ${event.error}`);
        isTTSLocked.current = false; // Release lock on error
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  }

  const handleTTSStart = () => {
    ttsActuallyStarted.current = true;
  };

  return (
  <div className="max-w-2xl mx-auto p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20">
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold text-white mb-2">
        Voice Assistant
      </h1>
      <p className="text-slate-300">Speak, get AI response, hear it back</p>

        {/* TTS Status Indicator */}
        <div className="mt-2 text-sm">
          Status:
          {ttsLoading && (
            <span className="text-yellow-600 ml-1">🔄 Loading TTS...</span>
          )}
          {ttsInitialized && !ttsError && (
            <span className="text-green-600 ml-1">✅ TTS Ready</span>
          )}
          {ttsError && (
            <span className="text-orange-600 ml-1">⚠️ Using Browser TTS</span>
          )}
          {/* Debug info for troubleshooting */}
          <div className="text-xs text-gray-500 mt-1">
            Loading: {ttsLoading ? 'true' : 'false'} | 
            Initialized: {ttsInitialized ? 'true' : 'false'} | 
            Error: {ttsError ? 'true' : 'false'}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center gap-4 mb-6 flex-wrap">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isSupported}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }
            disabled:bg-gray-300 disabled:cursor-not-allowed
          `}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>

        <button
          onClick={clearTranscription}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Clear
        </button>

        <button
          onClick={sendToGemini}
          disabled={!transcription || isGenerating}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating && <Loader className="animate-spin" size={16} />}
          {isGenerating ? "Generating..." : "Send to AI"}
        </button>

        <button
          onClick={() => speak(generatedResponse)}
          disabled={!generatedResponse || !ttsInitialized}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Volume2 size={16} />
          Speak Response
        </button>

        {/* Re-enable the stop button with better conditional rendering */}
        {isSpeaking && window.speechSynthesis?.speaking && (
          <button
            onClick={() => {
              console.log('🛑 Manual stop button clicked');
              stopSpeaking();
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Stop Speaking
          </button>
        )}

        {/* Add this button to test the browser TTS directly */}
        <button
          onClick={testBrowserTTS}
          disabled={isSpeaking || isTTSLocked.current || (generatedResponse && !hasSpokenResponse.current)}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          🔧 Test Browser TTS
        </button>

        {/* Add this button for a simpler test */}
        <button
          onClick={() => {
            if (isTTSLocked.current || isSpeaking) return;
            window.speechSynthesis.cancel();
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance("Hello world");
              window.speechSynthesis.speak(utterance);
            }, 100);
          }}
          disabled={isSpeaking || isTTSLocked.current}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          🔊 Simple Test
        </button>

        {/* Add this button for manual TTS restart */}
        <button
          onClick={() => {
            console.log('🔄 Manual TTS restart');
            window.speechSynthesis.cancel();
            hasSpokenResponse.current = false;
            autoSpeakAttempts.current = 0;
            isTTSLocked.current = false;
            
            if (generatedResponse) {
              setTimeout(() => {
                speak(generatedResponse);
              }, 300);
            }
          }}
          disabled={!generatedResponse}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300"
        >
          🔄 Retry TTS
        </button>
      </div>

      {/* Status Indicator - UPDATE */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader className="animate-spin text-white" size={16} />
          <span className="text-sm text-slate-300">Listening...</span>
        </div>
      )}

      {/* Error Display - UPDATE */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700/50 rounded-lg backdrop-blur-sm">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Transcription Results */}
      <div className="space-y-4">
        {/* Speech Transcription */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
    Your Speech:
  </label>
  <div className="min-h-[100px] p-4 border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
    <p className="text-white whitespace-pre-wrap">
      {transcription}
      {interimTranscript && (
        <span className="text-slate-400 italic">
          {interimTranscript}
        </span>
      )}
    </p>
    {!transcription && !interimTranscript && (
      <p className="text-slate-400 italic">
        Your transcription will appear here...
      </p>
    )}
  </div>
</div>

        {/* AI Generated Response */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            AI Response:
          </label>
          <div className="min-h-[100px] p-4 border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader className="animate-spin text-white" size={16} />
                <span className="text-slate-300 italic">
                  Generating response...
                </span>
              </div>
            ) : (
              <>
                {/* TextType Component */}
                <TextType
                  key={generatedResponse || "default"}
                  text={
                    generatedResponse && generatedResponse.trim().length > 0
                      ? [generatedResponse.trim()]
                      : ["AI response will appear here..."]
                  }
                  typingSpeed={50}
                  pauseDuration={3000}
                  showCursor={true}
                  className="text-white whitespace-pre-wrap leading-relaxed"
                />
                
                {/* Fallback display in case TextType fails */}
                <div className="mt-4 p-2 bg-blue-900/30 border border-blue-500/50 rounded text-xs">
                  <p className="text-blue-300">
                    <strong>Fallback Display:</strong>
                  </p>
                  <p className="text-white">
                    {generatedResponse && generatedResponse.trim().length > 0
                      ? generatedResponse.trim()
                      : "AI response will appear here..."}
                  </p>
                </div>
              </>
            )}
            
            {/* Debug info */}
            <p className="text-xs text-yellow-300 mt-2 opacity-50">
              Debug: Response length: {generatedResponse?.length || 0}
            </p>
          </div>
        </div>

        {/* Debug Messages - UPDATE */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-200 mb-2">
            Debug Messages ({debugMessages.length})
          </summary>
          <div className="mt-2 p-3 bg-white/10 rounded-lg text-xs font-mono text-slate-300 max-h-48 overflow-y-auto backdrop-blur-sm">
            {debugMessages.map((message, index) => (
              <div key={index} className="mb-1">
                {message}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
