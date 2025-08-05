"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface TextTypeProps {
  text: string[];
  typingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  className?: string;
  onComplete?: () => void;
}

const TextType: React.FC<TextTypeProps> = ({
  text,
  typingSpeed = 50,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "|",
  className = "",
  onComplete,
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const lastTextRef = useRef<string>(""); // Add this to track text changes

  const typeText = useCallback(
    (textToType: string, index: number) => {
      console.log("🔤 typeText called with:", {
        textToType: textToType.substring(0, 50) + "...",
        index,
        length: textToType?.length,
        isCurrentlyTyping: isTypingRef.current,
      });

      // If we're already typing the same text, don't restart
      if (isTypingRef.current && lastTextRef.current === textToType) {
        console.log("🔤 Same text already typing, skipping");
        return;
      }



      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      isTypingRef.current = true;
      lastTextRef.current = textToType;
      setDisplayedText("");

      let charIndex = 0;

      const typeChar = () => {
        if (charIndex < textToType.length) {
          setDisplayedText(textToType.substring(0, charIndex + 1));
          charIndex++;
          timeoutRef.current = setTimeout(typeChar, typingSpeed);
        } else {
          isTypingRef.current = false;
          console.log("🔤 ✅ Typing completed successfully!");

          if (onComplete) {
            onComplete();
          }

          // If there are more texts to display, move to next after pause
          if (index < text.length - 1) {
            timeoutRef.current = setTimeout(() => {
              setCurrentTextIndex(index + 1);
            }, pauseDuration);
          }
        }
      };

      typeChar();
    },
    [typingSpeed, pauseDuration, onComplete, text.length]
  );

  // Main effect that triggers typing
  useEffect(() => {
    console.log("🔤 Main useEffect triggered:", {
      textLength: text?.length,
      currentIndex: currentTextIndex,
      isTyping: isTypingRef.current,
    });

    if (!text || text.length === 0) {
      console.log("🔤 No text provided, showing placeholder");
      setDisplayedText("AI response will appear here...");
      return;
    }

    const currentText = text[currentTextIndex];
    if (!currentText) {
      console.log("🔤 No current text at index", currentTextIndex);
      return;
    }

    console.log("🔤 About to type:", currentText.substring(0, 50) + "...");
    typeText(currentText, currentTextIndex);

    return () => {
      // Don't clear if we're in the middle of typing
      if (!isTypingRef.current && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, currentTextIndex, typeText]);

  // Reset when text content actually changes (not just re-renders)
  useEffect(() => {
    const newTextContent = text?.[0] || "";

    if (newTextContent !== lastTextRef.current) {
      console.log("🔤 Text content changed, resetting:", {
        old: lastTextRef.current.substring(0, 50) + "...",
        new: newTextContent.substring(0, 50) + "...",
      });

      setCurrentTextIndex(0);
      setDisplayedText("");
      isTypingRef.current = false;
      lastTextRef.current = "";

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [text]);

  useEffect(() => {
    // Animate cursor blinking
    if (showCursor && cursorRef.current) {
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }
  }, [showCursor]);

  return (
    <span className={className}>
      <span ref={textRef}>{displayedText}</span>
      {showCursor && (
        <span
          ref={cursorRef}
          className="inline-block"
          style={{ opacity: 1 }}
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;
