'use client';

import { useState } from 'react';
import RealSpeechRecognition from '@/components/RealSpeechRecognition';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [llmResponse] = useState(''); // setLlmResponse removed as it's not used
  const [isProcessing] = useState(false); // setIsProcessing removed as it's not used

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Voice Assistant
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Offline-first • Speech-to-Text • LLM • Text-to-Speech
          </p>
        </header>

        <main className="max-w-4xl mx-auto space-y-8">
          {/* Phase 1: Real Whisper Integration */}
          <RealSpeechRecognition 
            onTranscript={(text: string) => {
              setTranscript(text);
              console.log('Real Whisper transcription:', text);
            }}
          />

          {/* Pipeline Status */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* STT Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Speech-to-Text
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${transcript ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {transcript ? 'Complete' : 'Waiting'}
                  </span>
                </div>
                {transcript && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {transcript}
                  </p>
                )}
              </div>
            </div>

            {/* LLM Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                LLM Processing
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${llmResponse ? 'bg-green-500' : isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {llmResponse ? 'Complete' : isProcessing ? 'Processing' : 'Waiting'}
                  </span>
                </div>
                {llmResponse && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {llmResponse}
                  </p>
                )}
              </div>
            </div>

            {/* TTS Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Text-to-Speech
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
