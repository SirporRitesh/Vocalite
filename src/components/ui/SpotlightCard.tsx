"use client";

import React, { useRef, useEffect } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.1)",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    card.addEventListener("mousemove", handleMouseMove);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-xl border border-white/20 
        bg-white/5 backdrop-blur-sm shadow-2xl
        before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500
        before:bg-[radial-gradient(800px_circle_at_var(--mouse-x)_var(--mouse-y),${spotlightColor},transparent_50%)]
        hover:before:opacity-100
        ${className}
      `}
      style={{
        "--mouse-x": "50%",
        "--mouse-y": "50%",
      } as React.CSSProperties}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;
