// src/components/SpeechRecognition.tsx
// React Component for Speech-to-Text Testing

'use client';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface SpeechRecognitionProps {
  modelSize?: 'tiny.en' | 'base.en' | 'tiny-en-q5_1' | 'base-en-q5_1';
  onTranscript?: (text: string) => void;
  className?: string;
}

/**
 * STEP 4: Speech Recognition Component
 * 
 * This component provides a user interface for testing our Whisper integration:
 * 1. Shows model loading progress with visual indicators
 * 2. Provides record/stop controls with proper state management
 * 3. Displays real-time transcription results
 * 4. Handles error states gracefully
 */
export default function SpeechRecognition({ 
  modelSize = 'tiny.en', 
  onTranscript,
  className = '' 
}: SpeechRecognitionProps) {
  // Use our custom speech recognition hook
  const {
    isLoading,
    isRecording,
    isInitialized,
    transcript,
    results,
    loadingProgress,
    loadingStatus,
    error,
    startRecording,
    stopRecording,
    clearTranscript
  } = useSpeechRecognition({ 
    modelSize,
    debug: true 
  });

  // Call the parent callback when transcript changes
  if (onTranscript && transcript) {
    onTranscript(transcript);
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Speech Recognition
        </h2>
        <div className="text-sm text-gray-500">
          Model: {modelSize}
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
              {loadingProgress > 0 && (
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
              )}
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
      {isInitialized && (
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            {/* Record/Stop Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
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
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <span>Stop Recording</span>
              </button>
            )}

            {/* Clear Button */}
            {transcript && (
              <button
                onClick={clearTranscript}
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
      )}

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
              {isInitialized 
                ? 'Click "Start Recording" to begin speech recognition...'
                : 'Loading speech recognition model...'
              }
            </p>
          )}
        </div>
      </div>

      {/* Results History */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            Recognition History ({results.length} results)
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {results.slice(-5).map((result) => (
              <div 
                key={result.timestamp}
                className="p-3 bg-blue-50 rounded border-l-4 border-blue-400"
              >
                <div className="text-sm text-gray-800">
                  &ldquo;{result.text}&rdquo;
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <span className={`ml-2 ${
              isRecording ? 'text-red-600' : 
              isInitialized ? 'text-green-600' : 
              isLoading ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {isRecording ? 'Recording' : 
               isInitialized ? 'Ready' : 
               isLoading ? 'Loading' : 'Initializing'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Results:</span>
            <span className="ml-2 text-gray-800">
              {results.length} transcriptions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
