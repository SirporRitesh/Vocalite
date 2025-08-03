# Voice Assistant Setup Guide

This project implements a complete voice assistant with Speech-to-Text (STT), AI processing, and Text-to-Speech (TTS) capabilities.

## Architecture Overview

```
User Speech → STT (Web Speech API) → AI Processing (Gemini) → TTS (Piper) → Audio Output
```

## Features Implemented

✅ **Speech Recognition**: Web Speech API for real-time speech-to-text
✅ **AI Processing**: Gemini API for intelligent responses  
✅ **Text-to-Speech**: Local Piper TTS for voice synthesis
✅ **Web Workers**: For non-blocking audio processing
✅ **React Hooks**: Clean state management for all components

## Setup Instructions

### 1. TTS Models Setup (Required for voice output)

The TTS functionality requires Piper TTS models to be downloaded and placed in the correct location.

#### Download Models:

1. Go to [Piper Releases](https://github.com/rhasspy/piper/releases)
2. Download a suitable English voice model, for example:
   - `en_US-lessac-medium.tar.gz` (recommended - good quality, moderate size)
   - `en_US-amy-medium.tar.gz` (alternative female voice)
   - `en_US-ryan-medium.tar.gz` (alternative male voice)

#### Extract and Install:

```bash
# Example for lessac voice
cd public/models/tts/
wget https://github.com/rhasspy/piper/releases/download/v1.2.0/en_US-lessac-medium.tar.gz
tar -xzf en_US-lessac-medium.tar.gz
```

#### Required Files:
```
public/models/tts/
├── en_US-lessac-medium.onnx         # Main TTS model
├── en_US-lessac-medium.onnx.json    # Model configuration
└── README.md
```

### 2. Run the Application

```bash
npm install
npm run dev
```

### 3. Test Components

- **Main Voice Assistant**: `http://localhost:3000` - Full STT + AI + TTS
- **TTS Demo**: `http://localhost:3000/tts-demo` - TTS testing only
- **Test Page**: `http://localhost:3000/test` - Component testing

## Component Structure

### Core Components

1. **WebSpeechRecognition.tsx**: Complete voice assistant
   - Speech recognition (Web Speech API)
   - AI processing (Gemini API)
   - TTS integration
   - Full conversation flow

2. **TTSComponent.tsx**: Standalone TTS testing
   - Text input
   - Speech synthesis
   - Audio playback controls

### Hooks

1. **useTTS.ts**: TTS state management
   - Worker lifecycle
   - Audio processing
   - Error handling

### Workers

1. **tts.worker.ts**: TTS processing
   - Piper TTS model loading
   - Text-to-speech synthesis
   - Audio buffer generation

## Usage Examples

### Basic TTS Usage

```typescript
import { useTTS } from './hooks/useTTS';

function MyComponent() {
  const { speak, isInitialized, isSpeaking } = useTTS();
  
  const handleSpeak = async () => {
    if (isInitialized) {
      await speak("Hello, this is a test!");
    }
  };
  
  return (
    <button onClick={handleSpeak} disabled={isSpeaking}>
      Speak
    </button>
  );
}
```

### Voice Assistant Flow

```typescript
// 1. User speaks
startRecording();

// 2. Speech → Text (Web Speech API)
const transcript = recognitionResult;

// 3. Text → AI Response (Gemini)
const aiResponse = await sendToGemini(transcript);

// 4. AI Response → Speech (Piper TTS)
await speak(aiResponse);
```

## Configuration Options

### TTS Configuration

```typescript
const tts = useTTS({
  modelUrl: '/models/tts/en_US-lessac-medium.onnx',
  configUrl: '/models/tts/en_US-lessac-medium.onnx.json',
  autoInit: true,
  debug: true
});
```

### Alternative Voice Models

To use different voices, update the model URLs in your component:

```typescript
// Female voice (Amy)
modelUrl: '/models/tts/en_US-amy-medium.onnx'
configUrl: '/models/tts/en_US-amy-medium.onnx.json'

// Male voice (Ryan)  
modelUrl: '/models/tts/en_US-ryan-medium.onnx'
configUrl: '/models/tts/en_US-ryan-medium.onnx.json'
```

## Troubleshooting

### TTS Not Working

1. **Check model files**: Ensure `.onnx` and `.onnx.json` files are in `public/models/tts/`
2. **Check console**: Look for TTS worker errors
3. **Check network**: Models must be served from the same origin
4. **Browser compatibility**: Requires modern browsers with AudioContext support

### Speech Recognition Issues

1. **Microphone permissions**: Browser will prompt for mic access
2. **HTTPS required**: Web Speech API requires HTTPS in production
3. **Browser support**: Works best in Chrome/Edge

### General Issues

1. **CORS headers**: Already configured in `next.config.ts`
2. **Worker loading**: Check browser console for worker errors
3. **Memory usage**: TTS models can be large (50-200MB)

## Performance Notes

- **Initial load**: TTS models download once and cache in browser
- **Memory usage**: ~100-200MB for TTS model
- **Audio generation**: Usually 1-3 seconds for typical sentences
- **Local processing**: No internet required after model download

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: TTS works, STT limited
- **Safari**: TTS works, STT iOS only
- **Mobile**: Works on modern mobile browsers

## API Keys

Update the Gemini API key in `WebSpeechRecognition.tsx`:

```typescript
"X-goog-api-key": "YOUR_GEMINI_API_KEY"
```

## File Structure

```
src/
├── components/
│   ├── WebSpeechRecognition.tsx    # Main voice assistant
│   └── TTSComponent.tsx            # TTS demo component
├── hooks/
│   └── useTTS.ts                   # TTS React hook
├── workers/
│   └── tts.worker.ts               # TTS web worker
└── app/
    ├── page.tsx                    # Main page
    └── tts-demo/
        └── page.tsx                # TTS demo page

public/
└── models/
    └── tts/
        ├── en_US-lessac-medium.onnx      # TTS model
        ├── en_US-lessac-medium.onnx.json # TTS config
        └── README.md
```
