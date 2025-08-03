// Simple test to verify whisper.js loading
/// <reference lib="webworker" />

console.log('[SimpleTest] Starting simple whisper.js test...');

// Minimal Module object
// eslint-disable-next-line no-var
var Module = {
    print: (text: string) => {
        console.log('[WASM] stdout:', text);
        postMessage({ type: 'stdout', data: text });
    },
    printErr: (text: string) => {
        console.error('[WASM] stderr:', text);
        postMessage({ type: 'stderr', data: text });
    },
    onRuntimeInitialized: () => {
        console.log('[SimpleTest] ✅ WASM Runtime initialized!');
        postMessage({ type: 'initialized', data: 'WASM runtime ready' });
    },
    onAbort: (what: string) => {
        console.error('[SimpleTest] ❌ WASM aborted:', what);
        postMessage({ type: 'abort', data: what });
    }
};

console.log('[SimpleTest] Module prepared, loading whisper.js...');

try {
    (self as DedicatedWorkerGlobalScope).importScripts('/models/whisper.js');
    console.log('[SimpleTest] whisper.js script loaded');
    postMessage({ type: 'script-loaded', data: 'whisper.js loaded' });
    
    // Check what's available after a brief delay
    setTimeout(() => {
        console.log('[SimpleTest] Post-load check:');
        console.log('[SimpleTest] typeof Module:', typeof Module);
        console.log('[SimpleTest] Module keys:', Object.keys(Module || {}));
        
        postMessage({ 
            type: 'module-check', 
            data: {
                moduleType: typeof Module,
                keys: Object.keys(Module || {}),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                hasFS: typeof (Module as any)?.FS,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                hasCCall: typeof (Module as any)?.ccall
            }
        });
    }, 2000);
    
} catch (error) {
    console.error('[SimpleTest] Failed to load whisper.js:', error);
    postMessage({ type: 'error', data: `Load error: ${error}` });
}

// Handle messages from main thread
self.onmessage = (event) => {
    console.log('[SimpleTest] Received message:', event.data);
    postMessage({ type: 'echo', data: event.data });
};

export {};
