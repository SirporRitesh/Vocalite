// Simple test worker to check if whisper.js loads
/// <reference lib="webworker" />

console.log('[TestWorker] Starting test worker...');

// Test if the whisper.js script can be loaded
try {
    console.log('[TestWorker] Loading whisper.js...');
    (self as DedicatedWorkerGlobalScope).importScripts('/models/whisper.js');
    console.log('[TestWorker] whisper.js loaded successfully');
    
    // Check what's available on global scope
    console.log('[TestWorker] Checking global scope...');
    console.log('[TestWorker] typeof Module:', typeof (globalThis as Record<string, unknown>).Module);
    console.log('[TestWorker] typeof whisper:', typeof (globalThis as Record<string, unknown>).whisper);
    
    // Send success message
    postMessage({ type: 'success', data: 'Test worker loaded successfully' });
    
} catch (error) {
    console.error('[TestWorker] Failed to load whisper.js:', error);
    postMessage({ type: 'error', data: `Failed to load whisper.js: ${error}` });
}

self.onmessage = (event) => {
    console.log('[TestWorker] Received message:', event.data);
    postMessage({ type: 'echo', data: event.data });
};

export {};
