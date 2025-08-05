"use client";

import Particles from "@/components/ui/Particles"; 
import SimpleParticles from "@/components/ui/SimpleParticles";
import WebSpeechRecognition from "@/components/WebSpeechRecognition";

export default function HomePage() {
  return (
   <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* 🔴 Red Particle Background */}
      <div className="absolute inset-0 -z-10">
        <Particles
          particleColors={["#ef4444", "#dc2626"]} // Red colors as requested
          particleCount={200}                     // Your specification
          particleSpread={10}                     // Your specification
          speed={0.1}                             // Your specification
          particleBaseSize={100}                  // Your specification
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/* 🎤 Voice Assistant Content */}
      <main className="flex items-center justify-center min-h-screen px-4">
        <WebSpeechRecognition />
      </main>
    </div>
  );
}

