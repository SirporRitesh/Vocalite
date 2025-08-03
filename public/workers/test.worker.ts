// public/workers/test.worker.ts

// This is the Web Worker's global scope.
// `self` refers to the WorkerGlobalScope.

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  console.log(`[Worker] Received message of type: ${type} with payload:`, payload);

  if (type === 'test') {
    // Respond immediately for validation testing
    self.postMessage({
      type: 'testResponse',
      success: true,
      timestamp: Date.now(),
    });
    console.log(`[Worker] Sent test response`);
  } else if (type === 'calculate') {
    // Perform a simple, non-blocking calculation
    const number = payload.number;
    const result = number * 2;

    // Send the result back to the main thread
    self.postMessage({
      type: 'calculationResult',
      result: result,
      originalNumber: number,
    });
    console.log(`[Worker] Sent result: ${result} for original number: ${number}`);
  } else {
    console.warn(`[Worker] Unknown message type: ${type}`);
  }
};

// Optional: Handle errors within the worker
self.onerror = (message, filename, lineno, colno, error) => {
  console.error('[Worker] An error occurred in the worker:', {
    message,
    filename,
    lineno,
    colno,
    error
  });
};

console.log('[Worker] test.worker.ts loaded and ready for validation.');