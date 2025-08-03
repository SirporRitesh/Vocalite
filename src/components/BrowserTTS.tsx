// src/components/BrowserTTS.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function BrowserTTS() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [testText] = useState("Hello, this is a test of the browser's speech synthesis system.");

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        console.log('Available voices:', availableVoices);
        setVoices(availableVoices);
        
        // Set default voice (prefer English)
        const englishVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en') && voice.localService
        );
        setSelectedVoice(englishVoice || availableVoices[0] || null);
      };

      // Load voices immediately
      loadVoices();
      
      // Also load when voices change (some browsers load them asynchronously)
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = (text: string) => {
    if (!isSupported || !text.trim()) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const testTTS = () => {
    console.log('Testing browser TTS...');
    speak(testText);
  };

  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Browser Speech Synthesis is not supported</p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-green-800">Browser TTS</h3>
        <div className="flex gap-2">
          <button
            onClick={testTTS}
            disabled={isSpeaking}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Volume2 size={14} />
            Test
          </button>
          
          {isSpeaking && (
            <button
              onClick={stop}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
            >
              <VolumeX size={14} />
              Stop
            </button>
          )}
        </div>
      </div>
      
      <div className="text-sm text-green-700">
        <p>Status: {isSpeaking ? '🔊 Speaking...' : '✅ Ready'}</p>
        <p>Voices available: {voices.length}</p>
        {selectedVoice && (
          <p>Current voice: {selectedVoice.name} ({selectedVoice.lang})</p>
        )}
      </div>

      {voices.length > 0 && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-green-700 mb-1">
            Select Voice:
          </label>
          <select
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = voices.find(v => v.name === e.target.value);
              setSelectedVoice(voice || null);
            }}
            className="w-full px-2 py-1 border border-green-300 rounded text-sm"
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang}) {voice.localService ? '(Local)' : '(Remote)'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
