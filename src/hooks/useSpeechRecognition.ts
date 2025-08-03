// src/hooks/useSpeechRecognition.ts
// React Hook for Speech-to-Text using Whisper.cpp WASM

import { useState, useEffect, useRef, useCallback } from 'react';

// Types for our hook
interface SpeechRecognitionConfig {
  modelSize?: 'tiny.en' | 'base.en' | 'tiny-en-q5_1' | 'base-en-q5_1';
  autoStart?: boolean;
  debug?: boolean;
}

interface SpeechRecognitionResult {
  text: string;
  timestamp: number;
  isFinal?: boolean;
}

interface SpeechRecognitionState {
  // Status states
  isLoading: boolean;
  isRecording: boolean;
  isInitialized: boolean;
  
  // Data
  transcript: string;
  results: SpeechRecognitionResult[];
  
  // Progress & errors
  loadingProgress: number;
  loadingStatus: string;
  error: string | null;
  
  // Controls
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  destroy: () => void;
}

/**
 * STEP 3: Speech Recognition Hook
 * 
 * This hook provides a clean interface to Whisper.cpp speech recognition:
 * 1. Manages the Whisper Web Worker lifecycle
 * 2. Handles model loading with progress tracking
 * 3. Provides real-time transcription results
 * 4. Manages recording state and error handling
 */
export function useSpeechRecognition(config: SpeechRecognitionConfig = {}): SpeechRecognitionState {
  // Configuration with defaults
  const {
    modelSize = 'tiny.en',
    autoStart = false,
    debug = false
  } = config;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<SpeechRecognitionResult[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Worker reference
  const workerRef = useRef<Worker | null>(null);
  const isDestroyedRef = useRef(false);

  /**
   * Step 3A: Initialize Whisper Worker
   */
  const initializeWorker = useCallback(async () => {
    if (isDestroyedRef.current || isInitialized) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLoadingStatus('Loading Whisper worker...');
      
      // Create the Whisper worker with proper Next.js 15 compatibility
      workerRef.current = new Worker('/whisper.worker.js');

      // Set up worker message handling
      workerRef.current.onmessage = (event) => {
        const { type, data, error: workerError } = event.data;

        if (debug) {
          console.log('[useSpeechRecognition] Worker message:', type, data);
        }

        switch (type) {
          case 'ready':
            setIsInitialized(true);
            setIsLoading(false);
            setLoadingStatus('Ready');
            console.log('[useSpeechRecognition] Whisper model loaded successfully');
            break;

          case 'transcription':
            if (data?.text) {
              const result: SpeechRecognitionResult = {
                text: data.text,
                timestamp: data.timestamp || Date.now(),
                isFinal: true
              };
              
              setResults(prev => [...prev, result]);
              setTranscript(prev => prev + (prev ? ' ' : '') + data.text);
              
              if (debug) {
                console.log('[useSpeechRecognition] New transcription:', data.text);
              }
            }
            break;

          case 'progress':
            if (data?.progress !== undefined) {
              setLoadingProgress(data.progress);
            }
            if (data?.status) {
              setLoadingStatus(data.status);
            }
            break;

          case 'error':
            console.error('[useSpeechRecognition] Worker error:', workerError);
            setError(workerError || 'Unknown error occurred');
            setIsLoading(false);
            setIsRecording(false);
            break;

          default:
            console.warn('[useSpeechRecognition] Unknown worker message type:', type);
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('[useSpeechRecognition] Worker error:', error);
        setError('Worker failed to load');
        setIsLoading(false);
      };

      // Initialize Whisper in the worker
      workerRef.current.postMessage({
        type: 'init',
        payload: {
          modelSize,
          debug
        }
      });

    } catch (err) {
      console.error('[useSpeechRecognition] Failed to initialize:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsLoading(false);
    }
  }, [modelSize, debug, isInitialized]);

  /**
   * Step 3B: Start Recording
   */
  const startRecording = useCallback(async () => {
    if (!isInitialized || !workerRef.current || isRecording) {
      console.warn('[useSpeechRecognition] Cannot start recording - not ready');
      return;
    }

    try {
      setError(null);
      setIsRecording(true);
      
      workerRef.current.postMessage({
        type: 'transcribe',
        payload: { action: 'start' }
      });
      
      if (debug) {
        console.log('[useSpeechRecognition] Started recording');
      }
    } catch (err) {
      console.error('[useSpeechRecognition] Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  }, [isInitialized, isRecording, debug]);

  /**
   * Step 3C: Stop Recording
   */
  const stopRecording = useCallback(() => {
    if (!isRecording || !workerRef.current) {
      return;
    }

    try {
      setIsRecording(false);
      
      workerRef.current.postMessage({
        type: 'transcribe',
        payload: { action: 'stop' }
      });
      
      if (debug) {
        console.log('[useSpeechRecognition] Stopped recording');
      }
    } catch (err) {
      console.error('[useSpeechRecognition] Failed to stop recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    }
  }, [isRecording, debug]);

  /**
   * Step 3D: Clear Transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setResults([]);
    setError(null);
  }, []);

  /**
   * Step 3E: Cleanup Resources
   */
  const destroy = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'destroy' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    isDestroyedRef.current = true;
    setIsInitialized(false);
    setIsLoading(false);
    setIsRecording(false);
    setError(null);
    
    if (debug) {
      console.log('[useSpeechRecognition] Destroyed');
    }
  }, [debug]);

  // Initialize on mount
  useEffect(() => {
    initializeWorker();
    
    return () => {
      destroy();
    };
  }, [initializeWorker, destroy]);

  // Auto-start recording if enabled
  useEffect(() => {
    if (autoStart && isInitialized && !isRecording) {
      startRecording();
    }
  }, [autoStart, isInitialized, isRecording, startRecording]);

  return {
    // Status states
    isLoading,
    isRecording,
    isInitialized,
    
    // Data
    transcript,
    results,
    
    // Progress & errors
    loadingProgress,
    loadingStatus,
    error,
    
    // Controls
    startRecording,
    stopRecording,
    clearTranscript,
    destroy
  };
}
