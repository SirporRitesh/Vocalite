'use client';

import { useState, useEffect } from 'react';
// import VoiceRecorder from '@/components/VoiceRecorder';
import AudioVisualizer from '@/components/AudioVisualizer';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request microphone permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionGranted(true);
        stream.getTracks().forEach(track => track.stop()); // Stop the initial stream
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setPermissionGranted(false);
      }
    };

    requestPermissions();
  }, []);

  const handleStartRecording = async () => {
    if (!permissionGranted) {
      alert('Microphone permission is required for voice recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      setTranscript('');
      setLlmResponse('');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsRecording(false);
    setIsProcessing(true);
    
    // Simulate processing pipeline
    setTimeout(() => {
      setTranscript('This is a sample transcription from the STT worker...');
      setTimeout(() => {
        setLlmResponse('This is a sample response from the LLM API...');
        setIsProcessing(false);
      }, 1000);
    }, 1000);
  };

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
          {/* Permission Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${permissionGranted ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-900 dark:text-white font-medium">
                Microphone: {permissionGranted ? 'Enabled' : 'Permission Required'}
              </span>
            </div>
          </div>

          {/* Voice Recording Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-8">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!permissionGranted}
                className={`w-24 h-24 rounded-full border-4 transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 border-red-600 scale-110 animate-pulse'
                    : 'bg-blue-500 border-blue-600 hover:scale-105'
                } ${
                  !permissionGranted
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                } flex items-center justify-center`}
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {isRecording ? (
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  )}
                </svg>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {isRecording
                ? 'Recording... Click to stop'
                : isProcessing
                ? 'Processing...'
                : 'Click to start recording'}
            </p>

            {/* Audio Visualizer */}
            {isRecording && audioStream && (
              <div className="mt-6">
                <AudioVisualizer audioStream={audioStream} />
              </div>
            )}
          </div>

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
