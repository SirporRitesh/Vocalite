// src/components/RealSpeechRecognition.tsx
// Real Speech Recognition using Whisper.cpp WASM

'use client';

import { useState, useRef, useEffect } from 'react';

// Types to match the worker's messages
interface ProgressPayload {
    status: 'loading_model' | 'ready';
    file?: string;
    progress: number;
}

interface WorkerResponse {
    type: 'progress' | 'ready' | 'transcription' | 'error' | 'debug';
    data?: ProgressPayload | string;
}

interface RealSpeechRecognitionProps {
  onTranscript?: (text: string) => void;
  className?: string;
}

/**
 * Real Whisper Speech Recognition Component
 * Uses whisper.cpp WASM for actual speech-to-text conversion
 */
export default function RealSpeechRecognition({ 
  onTranscript,
  className = '' 
}: RealSpeechRecognitionProps) {
  // Client-side rendering state
  const [isMounted, setIsMounted] = useState(false);
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const workerRef = useRef<Worker | null>(null);

  /**
   * Ensure client-side only rendering to prevent hydration mismatches
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Step 1: Initialize Whisper Worker (client-side only)
   */
  useEffect(() => {
    if (!isMounted) return;

    const initializeWorker = () => {
      try {
        setIsLoading(true);
        setLoadingStatus('Initializing Whisper worker...');
        setLoadingProgress(10);

        // Use the real whisper worker
        workerRef.current = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url));
        setLoadingStatus('Loading Whisper model...');
        
        // Handle messages from the whisper worker
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, data } = event.data;
          
          console.log('[RealSpeechRecognition] Worker message:', type, data);
          
          switch (type) {
            case 'progress':
              if (typeof data === 'object' && data !== null && 'progress' in data) {
                const progressData = data as ProgressPayload;
                setLoadingProgress(progressData.progress);
                const statusText = progressData.status === 'loading_model' 
                  ? `Loading model: ${progressData.file}` 
                  : 'Model ready';
                setLoadingStatus(statusText);
              }
              break;

            case 'ready':
              setIsModelLoaded(true);
              setIsLoading(false);
              setLoadingStatus('Whisper model ready');
              setLoadingProgress(100);
              console.log('[RealSpeechRecognition] Model ready.');
              break;
              
            case 'transcription':
              if (typeof data === 'string') {
                console.log('[RealSpeechRecognition] Transcription received:', data);
                // Append the new transcript segment
                setTranscript(prev => (prev + ' ' + data).trim());
                if (onTranscript) {
                  onTranscript(data);
                }
              }
              setIsProcessing(false);
              break;

            case 'error':
              if (typeof data === 'string') {
                console.error('[RealSpeechRecognition] Worker error:', data);
                setError(data);
              }
              setIsLoading(false);
              setIsRecording(false);
              setIsProcessing(false);
              break;

            case 'debug':
              if (typeof data === 'string') {
                console.log('[RealSpeechRecognition] Worker debug:', data);
              }
              break;
              
            default:
              console.warn(`[RealSpeechRecognition] Unknown worker message type: ${type}`);
          }
        };

        // Handle worker errors
        workerRef.current.onerror = (err) => {
          console.error('[RealSpeechRecognition] Worker error:', err);
          setError('Failed to initialize speech recognition worker. See console for details.');
          setIsLoading(false);
        };

        // Load the Whisper model in the worker
        workerRef.current.postMessage({
          type: 'load',
          model: 'ggml-tiny.en.bin' // This should match the model file in /public/models
        });

      } catch (err) {
        console.error('[RealSpeechRecognition] Failed to initialize worker:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setIsLoading(false);
      }
    };

    initializeWorker();

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [isMounted, onTranscript]);

  /**
   * Step 2: Start Recording Audio
   */
  const handleStartRecording = async () => {
    if (!isModelLoaded) {
      setError('Whisper model not loaded yet. Please wait...');
      return;
    }

    try {
      setError(null);
      setTranscript(''); // Clear previous transcript
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper prefers 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream); // Let the browser decide the mimeType

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Process the recorded audio
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType });
        
        console.log('[RealSpeechRecognition] Audio recorded:', {
          blobSize: audioBlob.size,
          chunks: audioChunksRef.current.length,
          type: audioBlob.type
        });
        
        if (workerRef.current && audioBlob.size > 0) {
          console.log('[RealSpeechRecognition] Processing audio for transcription, size:', audioBlob.size);
          
          try {
            // Decode audio in main thread using AudioContext
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) {
              throw new Error('AudioContext not supported in this browser');
            }
            const audioContext = new AudioContext({ sampleRate: 16000 }); // Specify target sample rate
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Get the PCM data (Float32Array) that whisper expects
            const pcmData = audioBuffer.getChannelData(0);
            
            console.log('[RealSpeechRecognition] Audio decoded to PCM, samples:', pcmData.length, 'sample rate:', audioBuffer.sampleRate);
            
            // Send PCM data to worker
            workerRef.current.postMessage({
              type: 'transcribe',
              audio: pcmData,
            });
            
            // Clean up audio context
            audioContext.close();
            
          } catch (error) {
            console.error('[RealSpeechRecognition] Audio decoding failed:', error);
            setError('Failed to decode audio: ' + (error instanceof Error ? error.message : 'Unknown error'));
            setIsProcessing(false);
          }
        } else {
          console.warn('[RealSpeechRecognition] No audio data to transcribe or worker not available');
          setError('No audio recorded or worker not available');
          setIsProcessing(false);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('[RealSpeechRecognition] Recording started');

    } catch (err) {
      console.error('[RealSpeechRecognition] Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  /**
   * Step 3: Stop Recording and Process Audio
   */
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      console.log('[RealSpeechRecognition] Recording stopped, processing...');
    }
  };

  /**
   * Step 4: Clear Transcript
   */
  const handleClear = () => {
    setTranscript('');
    setError(null);
  };

  // Prevent hydration mismatch by only rendering on client
  if (!isMounted) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading speech recognition...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Real Speech Recognition
        </h2>
        <div className="text-sm text-gray-500">
          Whisper.cpp (WASM)
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900">
                {loadingStatus}
              </div>
              <div className="mt-2">
                <div className="bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {Math.round(loadingProgress)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm font-medium text-yellow-800">
              An Error Occurred
            </div>
          </div>
          <div className="text-sm text-yellow-700">
            Error: {error}
          </div>
        </div>
      )}

      {/* Model Status */}
      {isModelLoaded && !isLoading && !error && (
        <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="text-sm font-medium text-green-800">
              Whisper model loaded and ready for speech recognition
            </div>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          {/* Record/Stop Button */}
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={isLoading || !isModelLoaded}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <div className="w-3 h-3 bg-white rounded-sm"></div>
              <span>Stop & Transcribe</span>
            </button>
          )}

          {/* Clear Button */}
          {transcript && (
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Clear</span>
            </button>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-medium">Recording...</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-700 font-medium">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          Transcription Results
        </h3>
        <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border">
          {transcript ? (
            <p className="text-gray-800 leading-relaxed">
              {transcript}
            </p>
          ) : (
            <p className="text-gray-500 italic">
              {isModelLoaded 
                ? 'Click "Start Recording" to begin speech recognition...'
                : 'Loading Whisper model, please wait...'
              }
            </p>
          )}
        </div>
      </div>

      {/* Status Info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Model:</span>
            <span className={`ml-2 ${isModelLoaded ? 'text-green-600' : 'text-gray-600'}`}>
              {isModelLoaded ? 'Loaded' : 'Loading...'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <span className={`ml-2 ${
              isRecording ? 'text-red-600' : 
              isProcessing ? 'text-blue-600' :
              isModelLoaded ? 'text-green-600' : 
              isLoading ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {isRecording ? 'Recording' : 
               isProcessing ? 'Processing' :
               isModelLoaded ? 'Ready' : 
               isLoading ? 'Loading' : 'Initializing'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Engine:</span>
            <span className="ml-2 text-gray-800">
              Whisper.cpp
            </span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          <strong>Real Implementation:</strong> Uses whisper.cpp compiled to WebAssembly. 
          The model runs entirely in your browser for privacy.
        </p>
      </div>
    </div>
  );
}
