// Mock Whisper Worker for testing UI functionality
/// <reference lib="webworker" />

interface WorkerMessage {
    type: 'load' | 'transcribe';
    model?: string;
    audio?: Float32Array;
}

interface ProgressPayload {
    status: 'loading_model' | 'ready';
    file?: string;
    progress: number;
}

interface WorkerResponse {
    type: 'progress' | 'ready' | 'transcription' | 'error';
    data?: ProgressPayload | string;
}

console.log('[MockWorker] Mock Whisper worker started');

let isReady = false;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    switch (type) {
        case 'load':
            await handleMockLoad(event.data);
            break;
        case 'transcribe':
            handleMockTranscribe(event.data);
            break;
        default:
            console.warn(`[MockWorker] Unknown message type: ${type}`);
    }
};

async function handleMockLoad({ model }: WorkerMessage) {
    console.log('[MockWorker] Mock loading model:', model);
    
    // Simulate loading progress
    postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 0 } } as WorkerResponse);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 25 } } as WorkerResponse);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 50 } } as WorkerResponse);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 75 } } as WorkerResponse);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    postMessage({ type: 'progress', data: { status: 'ready', progress: 100 } } as WorkerResponse);
    postMessage({ type: 'ready' } as WorkerResponse);
    
    isReady = true;
    console.log('[MockWorker] Mock model loaded successfully');
}

function handleMockTranscribe({ audio }: WorkerMessage) {
    if (!isReady) {
        postMessage({ type: 'error', data: 'Mock model not ready' } as WorkerResponse);
        return;
    }
    
    if (!audio) {
        postMessage({ type: 'error', data: 'No audio data provided' } as WorkerResponse);
        return;
    }
    
    console.log('[MockWorker] Mock transcribing audio, samples:', audio.length);
    
    // Simulate transcription delay
    setTimeout(() => {
        // Generate a mock transcription based on audio length
        // const duration = audio.length / 16000; // Assuming 16kHz sample rate
        const mockTranscriptions = [
            "Hello, this is a test transcription.",
            "The speech recognition system is working correctly.",
            "This is a mock transcription for testing purposes.",
            "The audio has been processed successfully.",
            "Mock whisper transcription completed."
        ];
        
        const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
        
        postMessage({ type: 'transcription', data: transcription } as WorkerResponse);
        console.log('[MockWorker] Mock transcription completed:', transcription);
    }, 1000);
}

export {};
