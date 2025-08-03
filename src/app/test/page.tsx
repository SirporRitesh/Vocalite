// src/app/test/page.tsx
// Simple test page to isolate issues

'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Test Page - Phase 1 Speech Recognition
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Basic UI Test</h2>
          <p className="text-gray-600">
            If you can see this page, the basic Next.js setup is working.
          </p>
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">✅ Next.js 15 is running correctly</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Speech Recognition Simulation</h2>
          
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Test Button
          </button>
          
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <p className="text-gray-800">
              This would be where the speech recognition component appears.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
