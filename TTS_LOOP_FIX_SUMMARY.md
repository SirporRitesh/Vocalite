# TTS Worker Loop Issue - Fix Summary

## Problem Identified

The application was experiencing an infinite loop of TTS worker processes due to:

1. **ONNX Runtime Initialization Failure**: The error `Failed to fetch dynamically imported module: https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm-simd-threaded.jsep.mjs` indicates ONNX Runtime couldn't load its WASM modules from CDN.

2. **Missing TTS Models**: The `public/models/tts/` directory only contains a README but no actual model files (`.onnx` and `.json`).

3. **No Retry Limits**: The original code had no mechanism to prevent infinite initialization attempts.

4. **Worker Creation Loop**: Failed workers were being recreated continuously without proper error handling.

## Fixes Applied

### 1. Added Retry Limits
- **TTS Worker**: Added `MAX_INIT_ATTEMPTS = 3` and `initializationAttempts` counter
- **React Hook**: Added `initAttemptsRef` and corresponding max attempts logic
- **Timeout Protection**: Added 30-second timeout for TTS initialization

### 2. Enhanced Error Handling
- **Graceful Degradation**: Workers now fail gracefully after max attempts
- **Better Error Messages**: More descriptive error messages for debugging
- **Attempt Tracking**: Clear logging of initialization attempts

### 3. Improved Worker Lifecycle
- **Proper Cleanup**: Reset attempt counters on successful initialization
- **State Management**: Better tracking of loading/initialized states
- **Resource Cleanup**: Proper termination and cleanup of failed workers

### 4. Next.js Configuration Updates
- **Webpack Configuration**: Added ONNX Runtime and WASM support
- **CORS Headers**: Enhanced headers for better cross-origin resource loading
- **AsyncWebAssembly**: Enabled experimental async WASM support

### 5. Error Boundary Component
- Created `TTSErrorBoundary` for graceful error handling
- Provides user-friendly error messages and recovery options
- Includes instructions for downloading required models

## Code Changes Summary

### Files Modified:
1. `src/workers/tts.worker.ts` - Added retry limits and timeout protection
2. `src/hooks/useTTS.ts` - Added attempt tracking and enhanced error handling
3. `next.config.ts` - Enhanced webpack and headers configuration
4. `src/components/TTSErrorBoundary.tsx` - New error boundary component

### Key Additions:
```typescript
// Retry limit constants
const MAX_INIT_ATTEMPTS = 3;
let initializationAttempts = 0;

// Timeout protection
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    reject(new Error('TTS initialization timeout after 30 seconds'));
  }, 30000);
});

// Race between initialization and timeout
ttsSession = await Promise.race([initPromise, timeoutPromise]);
```

## Required Actions to Complete Fix

### 1. Download TTS Models
The application needs actual TTS model files to work properly:

```bash
# Visit: https://github.com/rhasspy/piper/releases
# Download: en_US-lessac-medium.tar.gz
# Extract and place these files in public/models/tts/:
# - en_US-lessac-medium.onnx
# - en_US-lessac-medium.onnx.json
```

### 2. Alternative Solutions
If model download is not possible:
- Use browser's built-in SpeechSynthesis API as fallback
- Implement cloud-based TTS service integration
- Use Web Speech API for basic TTS functionality

### 3. Testing the Fix
```bash
# Clean start to ensure no cached issues
npm run build
npm run dev
```

## Prevention Measures

### 1. Environment Validation
Consider adding startup validation:
```typescript
const validateTTSEnvironment = async () => {
  // Check if model files exist
  // Validate ONNX Runtime availability
  // Test basic TTS functionality
};
```

### 2. Monitoring and Alerting
- Add telemetry for TTS initialization success/failure rates
- Implement health checks for critical TTS functionality
- Set up alerts for repeated initialization failures

### 3. Graceful Fallbacks
- Implement Web Speech API fallback
- Add user notification for TTS unavailability
- Provide manual controls when TTS fails

## Technical Details

### ONNX Runtime Issue
The specific error suggests ONNX Runtime was trying to load WASM modules from a CDN, which failed. This could be due to:
- Network connectivity issues
- CDN availability problems
- Cross-origin policy restrictions
- Missing local ONNX Runtime files

### Worker Process Loop
The infinite loop occurred because:
1. TTS initialization failed
2. Error handling triggered new worker creation
3. New worker also failed during initialization
4. Process repeated without limits
5. Eventually spawned 400+ worker processes

The fixes ensure this loop is broken after a reasonable number of attempts while providing clear error feedback to users.
