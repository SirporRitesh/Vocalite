// src/app/tts-demo/page.tsx
// Demo page for testing TTS functionality
'use client';

import TTSComponent from '../../components/TTSComponent';

export default function TTSDemo() {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Text-to-Speech Demo
          </h1>
          <p className="text-gray-600">
            Test the Piper TTS local speech synthesis
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main TTS Component */}
          <TTSComponent />

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Setup Instructions
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>1. Download TTS Models:</strong> This demo requires Piper TTS models. 
                Download from <a href="https://github.com/rhasspy/piper/releases" className="text-blue-600 hover:text-blue-800 underline">Piper Releases</a>
              </p>
              <p>
                <strong>2. Model Files Needed:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code className="bg-gray-100 px-1 rounded">en_US-lessac-medium.onnx</code></li>
                <li><code className="bg-gray-100 px-1 rounded">en_US-lessac-medium.onnx.json</code></li>
              </ul>
              <p>
                <strong>3. File Location:</strong> Place the model files in:
                <code className="bg-gray-100 px-1 rounded ml-1">public/models/tts/</code>
              </p>
              <p>
                <strong>4. Test:</strong> Once models are in place, click &ldquo;Initialize TTS&rdquo; or refresh this page.
              </p>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Technical Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Architecture:</h3>
                <ul className="space-y-1">
                  <li>• Piper TTS (Local ONNX models)</li>
                  <li>• Web Worker for processing</li>
                  <li>• AudioContext for playback</li>
                  <li>• React Hook for state management</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Features:</h3>
                <ul className="space-y-1">
                  <li>• Fully local processing</li>
                  <li>• No internet required after setup</li>
                  <li>• High-quality voice synthesis</li>
                  <li>• Real-time audio generation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
