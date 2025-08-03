// src/workers/whisper.worker.ts
// This worker is responsible for running the whisper.cpp model in the browser.

/// <reference lib="webworker" />

// --- Type Definitions ---

// This defines the interface for the Emscripten module that whisper.js will create.
/*
interface WhisperModule {
    onRuntimeInitialized?: () => void;
    onAbort?: (what: string) => void;
    monitorRunDependencies?: (left: number) => void;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    FS: {
        writeFile: (path: string, data: Uint8Array) => void;
    };
    ccall: (ident: string, returnType: string | null, argTypes: string[], args: (number | string)[]) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPF32: {
        set: (data: Float32Array, offset: number) => void;
    };
    UTF8ToString: (ptr: number) => string;
}
*/

// Messages sent from the main thread to the worker
interface WorkerMessage {
    type: 'load' | 'transcribe';
    model?: string; // e.g., 'whisper-tiny.en.bin'
    audio?: Float32Array;
}

// Progress payload for detailed status updates
interface ProgressPayload {
    status: 'loading_model' | 'ready';
    file?: string;
    progress: number;
}

// Messages sent from the worker back to the main thread
interface WorkerResponse {
    type: 'progress' | 'ready' | 'transcription' | 'error' | 'debug';
    data?: ProgressPayload | string;
}

// Helper function to send debug messages to main thread
function sendDebugMessage(message: string) {
    console.log(message);
    postMessage({ type: 'debug', data: message } as WorkerResponse);
}

// --- Worker State ---

let whisperContext: number | null = null; // Pointer to the C++ whisper_context object
let isReady = false;
let isModelLoading = false;
let isWasmReady = false;
let pendingModelData: { model: string; data: ArrayBuffer } | null = null;

// --- Emscripten Module Setup ---

// Emscripten requires the Module object to be defined in the global scope.
// We declare it with `var` to ensure it has global scope inside the worker.
// The `whisper.js` script will then augment this object with the compiled functions.

// Initialize the Module object for Emscripten
// Create a more robust Module configuration
// eslint-disable-next-line no-var
var Module = {
    print: (text: string) => {
        console.log('[WASM stdout]', text);
        sendDebugMessage(`[WASM stdout] ${text}`);
    },
    printErr: (text: string) => {
        console.error('[WASM stderr]', text);
        sendDebugMessage(`[WASM stderr] ${text}`);
        postMessage({ type: 'error', data: `WASM_ERROR: ${text}` } as WorkerResponse);
    },
    onRuntimeInitialized: () => {
        const message = '[Worker] ✅ Emscripten runtime initialized successfully!';
        console.log(message);
        sendDebugMessage(message);
        isWasmReady = true;
        
        // If we have pending model data, process it now
        if (pendingModelData) {
            console.log('[Worker] Processing pending model data...');
            sendDebugMessage('[Worker] Processing pending model data...');
            initializeWhisperModel(pendingModelData.model, pendingModelData.data);
            pendingModelData = null;
        }
    },
    onAbort: (what: string) => {
        const message = `[Worker] ❌ WASM module aborted: ${what}`;
        console.error(message);
        sendDebugMessage(message);
        postMessage({ type: 'error', data: `WASM module aborted: ${what}` } as WorkerResponse);
    },
    // Threading configuration - force single-threaded mode
    PTHREAD_POOL_SIZE: 0,  // Disable pthread support
    PTHREAD_POOL_SIZE_STRICT: 0,
    // Memory configuration
    INITIAL_MEMORY: 128 * 1024 * 1024, // 128MB
    MAXIMUM_MEMORY: 512 * 1024 * 1024, // 512MB
    ALLOW_MEMORY_GROWTH: true,
    // Force synchronous WASM loading
    WASM_BINARY_FILE: 'ggml-tiny.en.wasm',
    // Disable automatic initialization to prevent threading issues
    noInitialRun: false,
    // Add debugging callbacks
    preRun: [
        () => {
            const message = '[Worker] 🏃 WASM preRun phase';
            console.log(message);
            sendDebugMessage(message);
        }
    ],
    postRun: [
        () => {
            const message = '[Worker] 🏁 WASM postRun phase';
            console.log(message);
            sendDebugMessage(message);
        }
    ],
    locateFile: (path: string, scriptDirectory: string) => {
        const message = `[Worker] 📁 Locating file: ${path} in directory: ${scriptDirectory}`;
        console.log(message);
        sendDebugMessage(message);
        // Return full path for WASM files
        if (path.endsWith('.wasm')) {
            return '/models/' + path;
        }
        return scriptDirectory + path;
    }
};

sendDebugMessage(`[Worker] Module object initialized: ${Object.keys(Module)}`);

// Load the Emscripten "glue" code. This will download and compile the WASM.
// The path is relative to the server's public root.
sendDebugMessage('[Worker] Loading whisper.js...');

// Add a global error handler to catch any loading issues
self.addEventListener('error', (event) => {
    const message = `[Worker] Global error: ${event.error} ${event.message} ${event.filename}:${event.lineno}`;
    console.error(message);
    sendDebugMessage(message);
    postMessage({ type: 'error', data: `Worker global error: ${event.message}` } as WorkerResponse);
});

self.addEventListener('unhandledrejection', (event) => {
    const message = `[Worker] Unhandled promise rejection: ${event.reason}`;
    console.error(message);
    sendDebugMessage(message);
    postMessage({ type: 'error', data: `Worker unhandled rejection: ${event.reason}` } as WorkerResponse);
});

try {
    (self as DedicatedWorkerGlobalScope).importScripts('/models/whisper.js');
    sendDebugMessage('[Worker] whisper.js loaded successfully');
    
    // Check the Module object after loading
    setTimeout(() => {
        sendDebugMessage('[Worker] Post-load Module check:');
        sendDebugMessage(`[Worker] - Module type: ${typeof Module}`);
        sendDebugMessage(`[Worker] - Module keys: ${Object.keys(Module || {})}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendDebugMessage(`[Worker] - onRuntimeInitialized present: ${typeof (Module as any)?.onRuntimeInitialized}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendDebugMessage(`[Worker] - FS present: ${typeof (Module as any)?.FS}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendDebugMessage(`[Worker] - ccall present: ${typeof (Module as any)?.ccall}`);
    }, 1000);
    
    // Add a fallback timeout in case onRuntimeInitialized is never called
    setTimeout(() => {
        if (!isWasmReady) {
            const message = '[Worker] WASM runtime initialization timeout';
            console.error(message);
            sendDebugMessage(message);
            sendDebugMessage(`[Worker] Module object state: ${typeof Module}, keys: ${Object.keys(Module || {})}`);
            postMessage({ 
                type: 'error', 
                data: 'WASM runtime initialization timeout. The whisper.js module may be incompatible or corrupted.' 
            } as WorkerResponse);
        }
    }, 15000); // 15 second fallback timeout
    
} catch (error) {
    const message = `[Worker] Failed to load whisper.js: ${error}`;
    console.error(message);
    sendDebugMessage(message);
    postMessage({ type: 'error', data: `Failed to load whisper.js: ${error}` } as WorkerResponse);
}

/**
 * Initialize the Whisper model after both WASM runtime and model data are ready
 */
function initializeWhisperModel(model: string, modelData: ArrayBuffer) {
    try {
        console.log('[Worker] Initializing Whisper model:', model);
        postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 75 } } as WorkerResponse);

        // Save the model data to the Emscripten virtual file system
        const modelPath = `/${model}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Module as any).FS.writeFile(modelPath, new Uint8Array(modelData));

        // Initialize the whisper context from the file.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        whisperContext = (Module as any).ccall(
            'whisper_init_from_file',
            'number', // return type: context pointer
            ['string'], // arg types
            [modelPath] // args
        );

        if (!whisperContext || whisperContext === 0) {
            throw new Error('Failed to initialize whisper context from model file.');
        }

        isReady = true;
        isModelLoading = false;
        postMessage({ type: 'ready' } as WorkerResponse);
        postMessage({ type: 'progress', data: { status: 'ready', progress: 100 } } as WorkerResponse);
        console.log('[Worker] Whisper model successfully loaded and ready.');

    } catch (error) {
        console.error('[Worker] Error initializing Whisper model:', error);
        postMessage({ type: 'error', data: error instanceof Error ? error.message : 'Unknown error during model initialization' } as WorkerResponse);
        isModelLoading = false;
    }
}


// --- Main Message Handler ---

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    switch (type) {
        case 'load':
            await handleLoad(event.data);
            break;
        case 'transcribe':
            handleTranscribe(event.data);
            break;
        default:
            console.warn(`[Worker] Unknown message type: ${type}`);
    }
};


// --- Message Handling Logic ---

/**
 * Loads the Whisper model. This involves fetching the model file,
 * and then initializing it once the WASM runtime is ready.
 */
async function handleLoad({ model }: WorkerMessage) {
    if (isModelLoading) {
        console.warn('[Worker] Model loading already in progress.');
        return;
    }
    if (!model) {
        postMessage({ type: 'error', data: 'No model specified for loading.' } as WorkerResponse);
        return;
    }

    isModelLoading = true;
    postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 0 } } as WorkerResponse);

    try {
        console.log('[Worker] Fetching model file:', model);
        
        // Fetch the model from the public directory
        const modelResponse = await fetch(`/models/${model}`);
        if (!modelResponse.ok) {
            throw new Error(`Failed to fetch model '${model}': ${modelResponse.statusText}`);
        }
        const modelData = await modelResponse.arrayBuffer();
        console.log('[Worker] Model data fetched, size:', modelData.byteLength, 'bytes');
        postMessage({ type: 'progress', data: { status: 'loading_model', file: model, progress: 50 } } as WorkerResponse);

        // Check if WASM runtime is ready
        if (isWasmReady) {
            // WASM is ready, initialize immediately
            console.log('[Worker] WASM runtime ready, initializing model immediately...');
            initializeWhisperModel(model, modelData);
        } else {
            // WASM not ready yet, store the model data for later
            console.log('[Worker] WASM runtime not ready, storing model data for later initialization...');
            pendingModelData = { model, data: modelData };
            
            // Set a timeout to detect if WASM initialization is stuck
            setTimeout(() => {
                if (!isWasmReady && pendingModelData) {
                    console.error('[Worker] WASM initialization timeout - onRuntimeInitialized never called');
                    postMessage({ 
                        type: 'error', 
                        data: 'WASM module failed to initialize - onRuntimeInitialized callback was never triggered. This might indicate an issue with the whisper.js file or WASM compilation.' 
                    } as WorkerResponse);
                    isModelLoading = false;
                    pendingModelData = null;
                }
            }, 10000); // 10 second timeout
        }

    } catch (error) {
        console.error('[Worker] Error loading model:', error);
        postMessage({ type: 'error', data: error instanceof Error ? error.message : 'Unknown error' } as WorkerResponse);
        isModelLoading = false;
    }
}

/**
 * Transcribes a chunk of audio. This is the core speech-to-text function.
 */
function handleTranscribe({ audio }: WorkerMessage) {
    if (!isReady || !whisperContext) {
        postMessage({ type: 'error', data: 'Whisper model not ready.' } as WorkerResponse);
        return;
    }
    if (!audio) {
        postMessage({ type: 'error', data: 'No audio data provided for transcription.' } as WorkerResponse);
        return;
    }

    let audioPtr: number | null = null;
    try {
        // 1. Allocate memory in the WASM heap for the audio data
        const audioByteLength = audio.length * audio.BYTES_PER_ELEMENT;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioPtr = (Module as any)._malloc(audioByteLength);
        if (audioPtr === 0) {
            throw new Error('Failed to allocate memory for audio data.');
        }

        // 2. Copy the audio data from JS to the WASM heap
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Module as any).HEAPF32.set(audio, audioPtr! / audio.BYTES_PER_ELEMENT);

        // 3. Call the whisper_full function to transcribe.
        // We get the default parameters and then run the main transcription function.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params = (Module as any).ccall('whisper_full_default_params', 'number', ['number'], [0]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ret = (Module as any).ccall(
            'whisper_full',
            'number', // return type: 0 on success
            ['number', 'number', 'number', 'number'], // arg types: ctx, params, samples_ptr, num_samples
            [whisperContext, params, audioPtr, audio.length]
        );

        if (ret !== 0) {
            throw new Error(`Transcription failed with code ${ret}.`);
        }

        // 4. Extract the transcribed text from the WASM module's memory.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const numSegments = (Module as any).ccall('whisper_full_n_segments', 'number', ['number'], [whisperContext]);
        let fullTranscript = '';
        for (let i = 0; i < numSegments; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const segmentPtr = (Module as any).ccall('whisper_full_get_segment_text', 'number', ['number', 'number'], [whisperContext, i]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const segment = (Module as any).UTF8ToString(segmentPtr);
            fullTranscript += segment;
        }

        // 5. Send the result back to the main thread
        postMessage({ type: 'transcription', data: fullTranscript.trim() } as WorkerResponse);

    } catch (error) {
        console.error('[Worker] Transcription failed:', error);
        postMessage({ type: 'error', data: error instanceof Error ? error.message : 'Unknown error' } as WorkerResponse);
    } finally {
        // 6. Free the allocated memory to prevent memory leaks in the WASM module
        if (audioPtr) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Module as any)._free(audioPtr);
        }
    }
}


// --- Cleanup ---

// It's good practice to free the context when the worker is terminated.
self.onclose = () => {
    if (whisperContext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Module as any).ccall('whisper_free', null, ['number'], [whisperContext]);
    }
};

// Export an empty object to satisfy TypeScript's module system
export {};
