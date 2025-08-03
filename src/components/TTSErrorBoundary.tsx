// src/components/TTSErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface TTSErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface TTSErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component specifically designed for TTS-related errors
 * Prevents the entire app from crashing if TTS initialization fails
 */
export class TTSErrorBoundary extends Component<TTSErrorBoundaryProps, TTSErrorBoundaryState> {
  constructor(props: TTSErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TTSErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('[TTSErrorBoundary] TTS Error caught:', error, errorInfo);
    
    // You could also report the error to an error reporting service here
    if (error.message.includes('ONNX') || error.message.includes('TTS')) {
      console.warn('[TTSErrorBoundary] TTS-related error detected. This may be due to missing models or ONNX Runtime issues.');
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-lg font-semibold mb-2">
            🔊 TTS Service Unavailable
          </div>
          <div className="text-red-700 text-sm text-center mb-4">
            The Text-to-Speech service failed to initialize. This may be due to:
          </div>
          <ul className="text-red-600 text-sm space-y-1 mb-4">
            <li>• Missing TTS model files</li>
            <li>• Network connectivity issues</li>
            <li>• Browser compatibility problems</li>
          </ul>
          <div className="text-xs text-gray-600 text-center">
            <p className="mb-2">
              <strong>To fix this:</strong> Download the required TTS models from{' '}
              <a 
                href="https://github.com/rhasspy/piper/releases" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Piper TTS releases
              </a>
            </p>
            <p>
              Place the <code className="bg-gray-100 px-1 rounded">en_US-lessac-medium.onnx</code>{' '}
              and <code className="bg-gray-100 px-1 rounded">.json</code> files in{' '}
              <code className="bg-gray-100 px-1 rounded">public/models/tts/</code>
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useTTSErrorHandler() {
  const [error, setError] = React.useState<string | null>(null);
  
  const handleTTSError = React.useCallback((error: string | Error) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    console.error('[useTTSErrorHandler]', errorMessage);
    setError(errorMessage);
  }, []);
  
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);
  
  return { error, handleTTSError, clearError };
}
