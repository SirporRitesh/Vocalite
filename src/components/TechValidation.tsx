'use client';

import { useState, useEffect } from 'react';

interface TechValidationProps {
  onValidationComplete?: (results: ValidationResults) => void;
}

interface ValidationResults {
  whisperWasm: boolean;
  piperTts: boolean;
  webWorkers: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  audioContext: boolean;
}

export default function TechValidation({ onValidationComplete }: TechValidationProps) {
  const [results, setResults] = useState<ValidationResults>({
    whisperWasm: false,
    piperTts: false,
    webWorkers: false,
    serviceWorker: false,
    indexedDB: false,
    audioContext: false,
  });
  const [isValidating, setIsValidating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const validateTechnologies = async () => {
    setIsValidating(true);
    setLogs([]);
    const newResults = { ...results };

    addLog('🚀 Starting technical validation...');

    // 1. Test Web Workers
    try {
      const worker = new Worker(new URL('../workers/test.worker.ts', import.meta.url));
      worker.postMessage({ type: 'test' });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker timeout')), 3000);
        worker.onmessage = () => {
          clearTimeout(timeout);
          worker.terminate();
          resolve(true);
        };
        worker.onerror = reject;
      });
      newResults.webWorkers = true;
      addLog('✅ Web Workers: Supported');
    } catch (error) {
      addLog('❌ Web Workers: Failed - ' + (error as Error).message);
    }

    // 2. Test Service Worker
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        newResults.serviceWorker = true;
        addLog(`✅ Service Worker: ${registration ? 'Active' : 'Available'}`);
      } else {
        addLog('❌ Service Worker: Not supported');
      }
    } catch (error) {
      addLog('❌ Service Worker: Failed - ' + (error as Error).message);
    }

    // 3. Test AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      await audioContext.close();
      newResults.audioContext = true;
      addLog('✅ AudioContext: Supported');
    } catch (error) {
      addLog('❌ AudioContext: Failed - ' + (error as Error).message);
    }

    // 4. Test IndexedDB
    try {
      const request = indexedDB.open('validation-test', 1);
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase('validation-test');
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
      newResults.indexedDB = true;
      addLog('✅ IndexedDB: Supported');
    } catch (error) {
      addLog('❌ IndexedDB: Failed - ' + (error as Error).message);
    }

    // 5. Test Piper TTS Web
    try {
      // Try to import Piper TTS Web
      const piperModule = await import('@mintplex-labs/piper-tts-web');
      console.log('Piper TTS module loaded:', piperModule);
      newResults.piperTts = true;
      addLog('✅ Piper TTS Web: Module loaded successfully');
    } catch (error) {
      addLog('❌ Piper TTS Web: Failed to load - ' + (error as Error).message);
    }

    // 6. Test WebAssembly support (for Whisper.cpp)
    try {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
        // Test basic WASM functionality
        const wasmModule = new WebAssembly.Module(new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // WASM magic + version
          0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // Function signature
          0x03, 0x02, 0x01, 0x00, // Function declaration
          0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b // Function body (add)
        ]));
        const wasmInstance = new WebAssembly.Instance(wasmModule);
        console.log('WASM test passed:', typeof wasmInstance.exports);
        newResults.whisperWasm = true;
        addLog('✅ WebAssembly: Ready for Whisper.cpp');
      } else {
        addLog('❌ WebAssembly: Not supported');
      }
    } catch (error) {
      addLog('❌ WebAssembly: Failed - ' + (error as Error).message);
    }

    setResults(newResults);
    setIsValidating(false);
    onValidationComplete?.(newResults);

    const passedTests = Object.values(newResults).filter(Boolean).length;
    const totalTests = Object.values(newResults).length;
    addLog(`🏁 Validation complete: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      addLog('🎉 All technologies validated! Ready to proceed with full implementation.');
    } else {
      addLog('⚠️ Some technologies failed validation. Review before proceeding.');
    }
  };

  useEffect(() => {
    // Auto-run validation on component mount
    const runValidation = async () => {
      await validateTechnologies();
    };
    runValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-600' : 'text-red-600';
  };

  const overallScore = Object.values(results).filter(Boolean).length;
  const totalTests = Object.values(results).length;
  const scorePercentage = (overallScore / totalTests) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Phase 0: Technical Validation
        </h2>
        <button
          onClick={validateTechnologies}
          disabled={isValidating}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isValidating ? 'Validating...' : 'Re-run Tests'}
        </button>
      </div>

      {/* Overall Score */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Overall Compatibility Score
          </span>
          <span className={`text-2xl font-bold ${scorePercentage >= 100 ? 'text-green-600' : scorePercentage >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
            {overallScore}/{totalTests}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              scorePercentage >= 100 ? 'bg-green-500' : scorePercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${scorePercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {scorePercentage >= 100 
            ? '🎉 Perfect! All technologies are compatible.' 
            : scorePercentage >= 80 
            ? '⚠️ Good compatibility, but some issues to resolve.' 
            : '❌ Critical compatibility issues detected.'}
        </p>
      </div>

      {/* Individual Test Results */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.whisperWasm)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.whisperWasm)}`}>
                WebAssembly (Whisper.cpp)
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Required for offline speech recognition
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.piperTts)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.piperTts)}`}>
                Piper TTS Web
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Offline neural text-to-speech
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.webWorkers)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.webWorkers)}`}>
                Web Workers
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Background processing for AI models
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.serviceWorker)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.serviceWorker)}`}>
                Service Worker
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Offline functionality and caching
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.audioContext)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.audioContext)}`}>
                Audio Context
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Audio processing and playback
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(results.indexedDB)}</span>
            <div>
              <span className={`font-medium ${getStatusColor(results.indexedDB)}`}>
                IndexedDB
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Local model storage
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Logs */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold">Validation Logs</span>
          {isValidating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
              <span className="text-green-400">Running...</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500">Click &quot;Re-run Tests&quot; to start validation...</div>
          )}
        </div>
      </div>
    </div>
  );
}
