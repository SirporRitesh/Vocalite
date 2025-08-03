// src/workers/webspeech.worker.ts
// A simple worker that uses Web Speech API instead of whisper.cpp

/// <reference lib="webworker" />

interface WorkerMessage {
  type: 'start' | 'stop';
  audio?: Float32Array;
}

interface WorkerResponse {
  type: 'progress' | 'ready' | 'transcription' | 'error' | 'debug';
  data?: unknown;
}

// Check if we're in a worker context and have access to the main thread
// const recognition: unknown = null;

self.addEventListener('message', (event) => {
  const message: WorkerMessage = event.data;
  
  switch (message.type) {
    case 'start':
      startRecognition();
      break;
    case 'stop':
      stopRecognition();
      break;
    default:
      console.warn('[WebSpeech Worker] Unknown message type:', message.type);
  }
});

function startRecognition() {
  // Send ready message immediately since Web Speech API doesn't need model loading
  self.postMessage({
    type: 'progress',
    data: { status: 'ready', progress: 100 }
  } as WorkerResponse);
  
  self.postMessage({
    type: 'ready'
  } as WorkerResponse);
  
  // Since Web Speech API can only run in main thread, we'll send a message
  // telling the main thread to start recognition
  self.postMessage({
    type: 'debug',
    data: 'WebSpeech worker ready - Web Speech API must be used in main thread'
  } as WorkerResponse);
}

function stopRecognition() {
  self.postMessage({
    type: 'debug',
    data: 'WebSpeech worker stop requested'
  } as WorkerResponse);
}

// Initialize immediately
self.postMessage({
  type: 'debug',
  data: 'WebSpeech worker initialized'
} as WorkerResponse);
