// src/components/SimpleSpeechRecognition.tsx
// Simplified Speech Recognition Component without Web Workers

'use client';

import { useState } from 'react';

interface SimpleSpeechRecognitionProps {
  onTranscript?: (text: string) => void;
  className?: string;
}

/**
 * Simplified Speech Recognition Component for testing UI
 * This version doesn't use Web Workers to avoid Next.js 15 compatibility issues
 */
export default function SimpleSpeechRecognition({ 
  onTranscript,
  className = '' 
}: SimpleSpeechRecognitionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsLoading(false);
      setIsRecording(true);
      
      // Simulate some transcription after a delay
      setTimeout(() => {
        const newText = 'Hello, this is a simulated transcription result.';
        setTranscript(prev => prev + (prev ? ' ' : '') + newText);
        if (onTranscript) {
          onTranscript(newText);
        }
      }, 2000);
      
      setTimeout(() => {
        const newText = 'Speech recognition is working in simulation mode.';
        setTranscript(prev => prev + (prev ? ' ' : '') + newText);
        if (onTranscript) {
          onTranscript(transcript + ' ' + newText);
        }
      }, 4000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsLoading(false);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleClear = () => {
    setTranscript('');
    setError(null);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Speech Recognition (Simulation)
        </h2>
        <div className="text-sm text-gray-500">
          Phase 1 Testing
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div className="text-sm font-medium text-blue-900">
              Initializing speech recognition...
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm font-medium text-red-800">
              Error: {error}
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
              disabled={isLoading}
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
              <span>Stop Recording</span>
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
        </div>
      </div>

      {/* Transcript Display */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          Live Transcript
        </h3>
        <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border">
          {transcript ? (
            <p className="text-gray-800 leading-relaxed">
              {transcript}
            </p>
          ) : (
            <p className="text-gray-500 italic">
              Click &ldquo;Start Recording&rdquo; to begin speech recognition simulation...
            </p>
          )}
        </div>
      </div>

      {/* Status Info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <span className={`ml-2 ${
              isRecording ? 'text-red-600' : 
              isLoading ? 'text-blue-600' : 'text-green-600'
            }`}>
              {isRecording ? 'Recording' : 
               isLoading ? 'Loading' : 'Ready'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Mode:</span>
            <span className="ml-2 text-gray-800">
              Simulation
            </span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          <strong>Phase 1 Testing:</strong> This is a simulated version to test the UI architecture. 
          The real Whisper integration will be added once the basic UI is confirmed working.
        </p>
      </div>
    </div>
  );
}
