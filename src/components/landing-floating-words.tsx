"use client";

import { useEffect, useState } from "react";

export const TECH_WORDS = [
  "React",
  "TypeScript",
  "Node.js",
  "Next.js",
  "API",
  "REST",
  "GraphQL",
  "tRPC",
  "Docker",
  "Kubernetes",
  "Git",
  "CI/CD",
  "MongoDB",
  "PostgreSQL",
  "Redis",
  "Prisma",
  "JWT",
  "OAuth",
  "WebSocket",
  "Microservices",
  "AWS",
  "Lambda",
  "Tailwind",
  "OpenAI",
  "LLM",
  "Stream",
  "Vercel",
  "Webpack",
  "ESLint",
  "Jest",
] as const;

interface FloatingTechWordProps {
  className: string;
  startIndex: number;
  intervalMs?: number;
}

export function FloatingTechWord({
  className,
  startIndex,
  intervalMs = 2600,
}: FloatingTechWordProps) {
  const [index, setIndex] = useState(startIndex % TECH_WORDS.length);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setIndex((i) => (i + 1) % TECH_WORDS.length);
        setPhase("in");
      }, 450);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return (
    <span
      className={`landing-editorial__float-word ${className} landing-editorial__float-word--${phase}`}
      aria-hidden="true"
    >
      {TECH_WORDS[index]}
    </span>
  );
}
