import { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
}

export function TypewriterText({ text, speed = 80, className }: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    if (displayedLength >= text.length) return;

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [started, displayedLength, text.length, speed]);

  return (
    <div ref={ref} className={className}>
      <span>{text.slice(0, displayedLength)}</span>
      {started && displayedLength < text.length ? (
        <span className="typewriter-cursor" aria-hidden="true">|</span>
      ) : null}
    </div>
  );
}
