// src/components/TTSComponent.tsx
// Text-to-Speech Component using Piper TTS
'use client';

import React, { useState } from 'react';
import { useTTS } from '../hooks/useTTS';
import { Volume2, Loader, Play, Square } from 'lucide-react';

interface TTSComponentProps {
  text?: string;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  className?: string;
}

export default function TTSComponent({
  text: initialText = "",
  onSpeechStart,
  onSpeechEnd,
  className = ""
}: TTSComponentProps) {
  const [inputText, setInputText] = useState(initialText);
  
  const {
    isLoading,
    isSpeaking,
    isInitialized,
    progress,
    error,
    speak,
    stop,
    init
  } = useTTS({
    debug: true,
    autoInit: true
  });

  const handleSpeak = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to speak');
      return;
    }

    try {
      if (onSpeechStart) onSpeechStart();
      await speak(inputText);
    } catch (err) {
      console.error('Speech failed:', err);
      alert('Speech synthesis failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleStop = () => {
    stop();
    if (onSpeechEnd) onSpeechEnd();
  };

  // Update input text when prop changes
  React.useEffect(() => {
    if (initialText && initialText !== inputText) {
      setInputText(initialText);
    }
  }, [initialText, inputText]);

  // Handle speech end
  React.useEffect(() => {
    if (!isSpeaking && onSpeechEnd) {
      onSpeechEnd();
    }
  }, [isSpeaking, onSpeechEnd]);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Volume2 size={20} />
          Text-to-Speech (Piper TTS)
        </h2>
        <p className="text-gray-600 text-sm">
          Local text-to-speech synthesis using Piper TTS models
        </p>
      </div>

      {/* Status Display */}
      <div className="mb-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader className="animate-spin" size={16} />
            <span className="text-sm">
              {progress.status === 'loading_model' 
                ? `Loading TTS model... ${progress.progress}%`
                : 'Initializing TTS...'
              }
            </span>
          </div>
        )}
        
        {isInitialized && !isLoading && (
          <div className="flex items-center gap-2 text-green-600">
            <Volume2 size={16} />
            <span className="text-sm">TTS Ready</span>
          </div>
        )}

        {isSpeaking && (
          <div className="flex items-center gap-2 text-blue-600">
            <Volume2 className="animate-pulse" size={16} />
            <span className="text-sm">Speaking...</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={init}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry Initialization
          </button>
        </div>
      )}

      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Text to Speak:
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleSpeak}
          disabled={!isInitialized || isLoading || isSpeaking || !inputText.trim()}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${!isInitialized || isLoading || isSpeaking || !inputText.trim()
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
          `}
        >
          <Play size={16} />
          Speak
        </button>

        <button
          onClick={handleStop}
          disabled={!isSpeaking}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${!isSpeaking
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-red-500 hover:bg-red-600 text-white'
            }
          `}
        >
          <Square size={16} />
          Stop
        </button>

        {!isInitialized && !isLoading && (
          <button
            onClick={init}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            <Volume2 size={16} />
            Initialize TTS
          </button>
        )}
      </div>

      {/* Quick Test Buttons */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Quick Tests:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Hello, this is a test of the text-to-speech system.",
            "The weather is lovely today.",
            "Voice synthesis is working correctly."
          ].map((testText, index) => (
            <button
              key={index}
              onClick={() => setInputText(testText)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border transition-colors"
              disabled={isLoading}
            >
              Test {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Model Status */}
      {isInitialized && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              TTS Information
            </summary>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Model: Piper TTS (Local)</p>
              <p>Status: {isInitialized ? 'Ready' : 'Not initialized'}</p>
              <p>Engine: Web Worker + AudioContext</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
