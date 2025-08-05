"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Mesh, Program, Geometry, Vec3 } from "ogl";

interface ParticlesProps {
  particleColors?: string[];
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleBaseSize?: number;
  moveParticlesOnHover?: boolean;
  alphaParticles?: boolean;
  disableRotation?: boolean;
}

const Particles: React.FC<ParticlesProps> = ({
  particleColors = ["#ffffff", "#ffffff"],
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleBaseSize = 100,
  moveParticlesOnHover = true,
  alphaParticles = false,
  disableRotation = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<Transform | null>(null);
  const particlesRef = useRef<Mesh[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize renderer
    const renderer = new Renderer({
      canvas: containerRef.current.querySelector("canvas") as HTMLCanvasElement,
      alpha: true,
      antialias: true,
    });
    rendererRef.current = renderer;

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    // Setup camera
    const camera = new Camera(gl, { fov: 45 });
    camera.position.set(0, 0, 5);

    // Create scene
    const scene = new Transform();
    sceneRef.current = scene;

    // Vertex shader
    const vertex = `
      attribute vec3 position;
      attribute vec3 offset;
      attribute float size;
      attribute float alpha;
      
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float uTime;
      uniform vec2 uMouse;
      
      varying float vAlpha;
      
      void main() {
        vec3 pos = position;
        
        // Add wave motion
        pos.x += sin(uTime * 0.5 + offset.x * 0.1) * 0.1;
        pos.y += cos(uTime * 0.3 + offset.y * 0.1) * 0.1;
        
        // Mouse interaction
        vec2 mouseInfluence = uMouse * 0.001;
        pos.xy += mouseInfluence * (1.0 - length(offset.xy) * 0.1);
        
        pos += offset;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (1.0 + sin(uTime + offset.x) * 0.1);
        
        vAlpha = alpha;
      }
    `;

    // Fragment shader
    const fragment = `
      precision mediump float;
      
      uniform vec3 uColor;
      varying float vAlpha;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= vAlpha;
        
        gl_FragColor = vec4(uColor, alpha * 0.8);
      }
    `;

    // Create particles
    const particles: Mesh[] = [];
    const positions: number[] = [];
    const offsets: number[] = [];
    const sizes: number[] = [];
    const alphas: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Position (always at origin for instanced rendering)
      positions.push(0, 0, 0);
      
      // Random offset within spread
      offsets.push(
        (Math.random() - 0.5) * particleSpread,
        (Math.random() - 0.5) * particleSpread,
        (Math.random() - 0.5) * 2
      );
      
      // Random size
      sizes.push(Math.random() * (particleBaseSize * 0.01) + (particleBaseSize * 0.005));
      
      // Random alpha
      alphas.push(alphaParticles ? Math.random() * 0.8 + 0.2 : 0.6);
    }

    // Create geometry
    const geometry = new Geometry(gl, {
      position: { size: 3, data: new Float32Array(positions) },
      offset: { size: 3, data: new Float32Array(offsets) },
      size: { size: 1, data: new Float32Array(sizes) },
      alpha: { size: 1, data: new Float32Array(alphas) },
    });

    // Convert hex color to RGB values
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      } : { r: 1, g: 1, b: 1 };
    };

    const primaryColor = hexToRgb(particleColors[0] || "#ffffff");

    // Create program/material
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new Vec3(0, 0) },
        uColor: { value: new Vec3(primaryColor.r, primaryColor.g, primaryColor.b) },
      },
      transparent: true,
      depthTest: false,
    });

    // Create mesh
    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
    mesh.setParent(scene);
    particles.push(mesh);
    particlesRef.current = particles;

    // Resize handler
    const handleResize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
    };

    // Mouse handler
    const handleMouseMove = (e: MouseEvent) => {
      if (!moveParticlesOnHover) return;
      
      const { innerWidth, innerHeight } = window;
      mouseRef.current.x = (e.clientX / innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / innerHeight) * 2 + 1;
    };

    // Animation loop
    let time = 0;
    const animate = () => {
      time += speed;
      
      particles.forEach((particle) => {
        particle.program.uniforms.uTime.value = time;
        particle.program.uniforms.uMouse.value.set(
          mouseRef.current.x,
          mouseRef.current.y
        );
        
        if (!disableRotation) {
          particle.rotation.z = time * 0.1;
        }
      });

      renderer.render({ scene, camera });
      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    handleResize();
    animate();

    // Event listeners
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up WebGL resources
      geometry.remove();
      program.remove();
    };
  }, [
    particleColors,
    particleCount,
    particleSpread,
    speed,
    particleBaseSize,
    moveParticlesOnHover,
    alphaParticles,
    disableRotation,
  ]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas className="w-full h-full" />
    </div>
  );
};

export default Particles;
