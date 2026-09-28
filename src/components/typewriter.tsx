"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useReducedMotion } from "@/components/ReducedMotionProvider";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 30,
  className = "",
}: TypewriterProps) {
  const { prefersReducedMotion } = useReducedMotion();
  const [displayedText, setDisplayedText] = useState(prefersReducedMotion ? text : "");
  const [currentIndex, setCurrentIndex] = useState(prefersReducedMotion ? text.length : 0);
  const [isComplete, setIsComplete] = useState(prefersReducedMotion);
  const [showCursor, setShowCursor] = useState(!prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      setShowCursor(false);
      return;
    }

    setDisplayedText("");
    setCurrentIndex(0);
    setIsComplete(false);
    setShowCursor(true);
  }, [text, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || currentIndex >= text.length) {
      if (!prefersReducedMotion) {
        setIsComplete(true);
        setTimeout(() => setShowCursor(false), 1000);
      }
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, prefersReducedMotion]);

  useEffect(() => {
    if (!isComplete && !prefersReducedMotion) {
      const cursorInterval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 1000);

      return () => clearInterval(cursorInterval);
    }
  }, [isComplete, prefersReducedMotion]);

  return (
    <div className={className}>
      <ReactMarkdown>{displayedText}</ReactMarkdown>
      {showCursor && !isComplete && (
        <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
      )}
    </div>
  );
}
