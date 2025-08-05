// src/components/WebSpeechRecognition.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Mic, MicOff, Loader } from "lucide-react";
import { useTTS } from "../hooks/useTTS";
import SpotlightCard from "./ui/SpotlightCard";
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
  const ttsActuallyStarted = useRef(false);
  const isTTSLocked = useRef(false);
  const autoSpeakAttempts = useRef(0);

  // Initialize TTS
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
  } = useTTS({
    debug: true,
    autoInit: false,
  });

  // ✅ MOVE useMemo HERE - BEFORE any early returns
  const textTypeText = useMemo(() => {
    return generatedResponse && generatedResponse.trim().length > 0
      ? [generatedResponse.trim()]
      : ["AI response will appear here..."];
  }, [generatedResponse]);

  const textTypeTexttrans = useMemo(() => {
    return transcription && transcription.trim().length > 0
      ? [transcription.trim()]
      : ["Your transcription will appear here..."];
  }, [transcription]);

  // All your useEffect hooks here...
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
          // When handling the final transcript, before sending to AI:
          isTTSLocked.current = false;
          sendToGemini();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Clear TTS lock when starting new recording session
        isTTSLocked.current = false;

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
    stopSpeaking();
    addDebugMessage("Transcription cleared");
  };

  // Send transcription to Gemini with latency tracking
  const sendToGemini = useCallback(async () => {
    // Check for API key
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      const errorMsg = "Gemini API key not configured";
      setError(errorMsg);
      addDebugMessage(`❌ ${errorMsg}`);
      return;
    }

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
}, [transcription, isRecording, isGenerating, generatedResponse, sendToGemini]);

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
}, [generatedResponse, ttsInitialized, isSpeaking, speak]);

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

  // ✅ Early return AFTER all hooks
  if (!isSupported) {
    return (
      <SpotlightCard 
        className="max-w-2xl w-full p-8"
        spotlightColor="rgba(239, 68, 68, 0.2)"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">
            Voice Assistant
          </h1>
          <div className="bg-red-900/50 border border-red-700/50 rounded-lg p-6 backdrop-blur-sm">
            <p className="text-red-200">
              Web Speech API is not supported in this browser. Please try using
              Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </SpotlightCard>
    );
  }

  // Main return statement
  return (
    <SpotlightCard 
      className="max-w-2xl w-full p-8"
      spotlightColor="rgba(0, 229, 255, 0.2)"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-3">
          Voice Assistant
        </h1>
        <p className="text-slate-300 text-lg">Speak, get AI response, hear it back</p>

        {/* TTS Status Indicator */}
        <div className="mt-4 text-sm">
          <span className="text-slate-400">Status:</span>
          {ttsLoading && (
            <span className="text-yellow-400 ml-2">🔄 Loading...</span>
          )}
          {ttsInitialized && !ttsError && (
            <span className="text-green-400 ml-2">✅ Ready</span>
          )}
          {ttsError && (
            <span className="text-orange-400 ml-2">⚠️ Using Browser TTS</span>
          )}
        </div>
      </div>

          {/* Recording Controls */}
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {/* Start/Stop Recording */}
            {!isRecording && (
              <button
                onClick={startRecording}
                disabled={!isSupported}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Mic size={20} />
                Start Recording
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
              >
                <MicOff size={20} />
                Stop Recording
              </button>
            )}

            {/* Clear button: only show if a response is present */}
            {generatedResponse && (
              <button
                onClick={clearTranscription}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors shadow-lg"
              >
                Clear
              </button>
            )}

            {/* Stop Speaking: only show if TTS is speaking */}
            {isSpeaking && (
              <button
                onClick={() => {
                  console.log('🛑 Manual stop button clicked');
                  stopSpeaking();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
              >
                Stop Speaking
              </button>
            )}

            {/* Test Button for TextType
            <button
              onClick={() => {
                console.log("🧪 Testing TextType with hardcoded text");
                setGeneratedResponse("This is a test response to verify that the TextType component is working correctly with typing animation. The text should appear character by character.");
              }}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium"
            >
              🧪 Test TextType
            </button> */}
          </div>

          {/* Status Indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <Loader className="animate-spin text-blue-400" size={16} />
              <span className="text-sm text-slate-300">Listening...</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg backdrop-blur-sm">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Transcription Results */}
          <div className="space-y-6">
            {/* Speech Transcription */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                Your Speech:
              </label>
              <div className="min-h-[100px] p-4 border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
                <TextType
                  key={transcription ? "transcription" : "placeholder"}
                  text={textTypeTexttrans}
                  typingSpeed={50}
                  pauseDuration={3000}
                  showCursor={false}
                  className={
                    transcription && transcription.trim().length > 0
                      ? "text-white whitespace-pre-wrap leading-relaxed"
                      : "text-slate-400 italic whitespace-pre-wrap leading-relaxed"
                  }
                />
              </div>
            </div>

            {/* AI Generated Response with TextType Animation */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                AI Response:
              </label>
              <div className="min-h-[120px] p-4 border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader className="animate-spin text-white" size={16} />
                    <span className="text-slate-300 italic">
                      Generating response...
                    </span>
                  </div>
                ) : (
                  <TextType
                    key={generatedResponse ? "response" : "default"}
                    text={textTypeText}
                    typingSpeed={50}
                    pauseDuration={3000}
                    showCursor={false}
                    className={
                      generatedResponse && generatedResponse.trim().length > 0
                        ? "text-white whitespace-pre-wrap leading-relaxed"
                        : "text-slate-400 italic whitespace-pre-wrap leading-relaxed"
                    }
                  />
                )}
              </div>
            </div>

            {/* Debug Messages */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-slate-200 mb-2 hover:text-white transition-colors">
                Debug Messages ({debugMessages.length})
              </summary>
              <div className="mt-3 p-4 bg-slate-900/50 border border-white/10 rounded-lg text-xs font-mono text-slate-400 max-h-48 overflow-y-auto backdrop-blur-sm">
                {debugMessages.map((message, index) => (
                  <div key={index} className="mb-1">
                    {message}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </SpotlightCard>
  );
}
