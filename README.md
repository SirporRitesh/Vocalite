# 🔊 Vocalite – Next.js Offline-Capable Voice Assistant

A **Next.js-based voice assistant** providing **near-offline functionality** with speech-to-text (STT), AI-powered responses, and text-to-speech (TTS).

---

## 🎯 Project Overview

This application demonstrates a complete voice interaction pipeline:

**Speech Recognition → AI Processing → Speech Synthesis → Audio Playback**

The app runs offline after the first load (except for AI API calls) with local caching for models and assets.

---

## ✨ Features

### 🔧 Core Functionality

- 🎤 **Real-time Speech Recognition** – Web Speech API with live transcription  
- 🤖 **AI-Powered Responses** – Integration with OpenAI/Gemini APIs  
- 🔊 **Text-to-Speech** – Browser TTS with fallback mechanisms  
- ⚡ **Performance Monitoring** – Real-time latency tracking for each pipeline stage

### 📡 Offline Capabilities

- 📦 **Service Worker** – Caches static assets and models  
- 🌐 **Progressive Web App** – Installable with manifest  
- 💾 **Local TTS Fallback** – Browser-based speech synthesis when offline  
- 🔄 **Automatic Retry Logic** – Handles network failures gracefully

### 🚀 Performance Optimizations

- ⏱️ **Sub-1.2s Response Time** – Optimized for fast interactions  
- 🚀 **Lazy Loading** – Models loaded on demand  
- 📊 **Debug Monitoring** – Comprehensive performance metrics  
- 🔧 **Error Recovery** – Robust fallback mechanisms

---

## 🧭 Data Flow
```markdown

```plaintext
User Speech → Web Speech API → Text Transcript → AI API → AI Response → Browser TTS → Audio Playback
     ↓              ↓              ↓           ↓         ↓             ↓            ↓
  [Local] → [Browser] → [Memory] → [Network] → [Memory] → [Browser] → [Local]
```

---

## 🚀 Quick Start

### 🔐 Prerequisites

- Node.js 18+ and npm/yarn  
- Modern browser with Web Speech API support  
- OpenAI or Google Gemini API key

### 📦 Installation

```bash
git clone https://github.com/SirporRitesh/Vocalite.git
cd Vocalite
npm install
# or
yarn install
```
### Environment Setup
```bash
cp .env.example .env.local
//Add your API keys to .env.local:
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here (Not Free)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here (Free)
```


### Run the development server


```bash
npm run dev
# or
yarn dev
```

### Open your browser

Navigate to http://localhost:3000


### Production Deployment
```bash
npm run build
npm run start
```
## 📱 Usage
### Basic Voice Interaction

- Click "Start Recording" button
- Speak your question clearly
- Wait for transcription to appear
- AI response will be generated and spoken automatically
- View performance metrics in debug panel

### Offline Mode Testing

- Load the app once while online
- Disconnect from internet
- Voice recognition and TTS will still work
- Only AI API calls require network connection

### 🔧 Configuration
- API Providers
- Switch between OpenAI and Gemini in the component:
  
  ``ts
  //In WebSpeechRecognition.tsx
 const useOpenAI = true; // Set to false for Gemini
``

- TTS Settings
- Adjust speech synthesis parameters:
  
  ``ts
  //In useTTS.ts
 const utterance = new SpeechSynthesisUtterance(text);
 utterance.rate = 1.0;    // Speech speed
 utterance.pitch = 1.0;   // Voice pitch
 utterance.volume = 1.0;  // Audio volume
``

- Performance Tuning

### Adjust timeout values in useTTS.ts
- Modify retry logic in voice loading
- Configure service worker caching strategies

## 📊 Performance Metrics
Current Performance (Good)

- Speech Recognition: ~500ms (browser-dependent)
- API Response Time: 1,200-1,500ms
- TTS Generation: ~200ms (browser synthesis)
- Total Pipeline: ~1,500ms

### Target Performance Goals

- Total Response Time: <1,200ms
- STT Latency: <300ms
- API Latency: <800ms
- TTS Latency: <100ms

### Optimization Opportunities

- Replace Web Speech API with local Whisper.cpp WASM
- Implement local TTS with Coqui WASM models
- Optimize API calls with request streaming
- Add response caching for common queries

## 🐛 Known Issues & Limitations
Current Limitations

- Browser Dependency: STT and TTS rely on browser APIs
- Network Required: AI responses need internet connection
- Browser Compatibility: Web Speech API support varies
- TTS Reliability: speechSynthesis can be inconsistent

## 🛠️ Troubleshooting
TTS Not Working:

### Check browser compatibility
- Ensure voices are loaded (speechSynthesis.getVoices())
- Try the TTS reset button in debug panel
- Hard Refresh (Open Dev tools, whilst dev tools open, hit Ctrl+Shift+R)

### Speech Recognition Issues:

- Verify microphone permissions
- Check browser support for Web Speech API
- Ensure HTTPS or localhost environment

### API Errors:

- Verify API keys in environment variables
- Check network connectivity
- Review API rate limits

  ---

## 📁 Project Structure

```markdown

```plaintext
src/
├── components/
│   ├── WebSpeechRecognition.tsx    # Main voice assistant component
│   └── ui/                         # Reusable UI components
├── hooks/
│   ├── useTTS.ts                   # Text-to-speech hook
│   └── useWebSpeech.ts            # Speech recognition hook
├── lib/
│   ├── api.ts                      # API integration utilities
│   └── utils.ts                    # Helper functions
├── pages/
│   ├── index.tsx                   # Main application page
│   └── api/                        # API routes (if needed)
└── styles/
    └── globals.css                 # Global styles
```

---

    
## 🔄 Development Roadmap
### Phase 1: Current Implementation ✅

 - [x] Basic voice recognition (Web Speech API)
 - [x] AI integration (OpenAI/Gemini)
 - [x] Browser TTS implementation
 - [x] Performance monitoring
 - [x] Error handling and recovery
 - [x] Multi-language support

### Phase 2: Local Processing (Development)

 - Whisper.cpp WASM integration for STT
 - Coqui TTS WASM implementation
 - Web Worker architecture for processing
 - Advanced offline capabilities

### Phase 3: Optimization (Planned)

 - Response streaming for faster perceived performance
 - Advanced caching strategies
 - Voice activity detection

   ---

## 🤝 Contributing

- Fork the repository
- Create a feature branch
  ```bash
  
  (git checkout -b feature/amazing-feature)
  ```
- Commit your changes
  ```bash
  
  (git commit -m 'Add amazing feature')
  ```
- Push to the branch
  ```bash
  
  (git push origin feature/amazing-feature)
  ```
- Open a Pull Request

## 🙏 Acknowledgments

- Web Speech API documentation and community
- OpenAI and Google for AI API access
- Next.js team for the excellent framework
- Browser vendors for speech synthesis support

---

## 📞 Contact
### Developer: Ritesh Sirpor
### Email: rsirpor@gmail.com
### Repository: https://github.com/SirporRitesh/Vocalite

---
*Built with ❤️ using Next.js, TypeScript, and modern web technologies*
