"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  confidence: number;
  score: number;
}

function scoreColor(score: number) {
  if (score >= 70) {
    return {
      stroke: "oklch(0.74 0.19 66)", // gold — design tier 1
      glow: "oklch(0.74 0.19 66 / 25%)",
      label: "Confiável",
    };
  }
  if (score >= 40) {
    return {
      stroke: "oklch(0.74 0.16 85)", // amber — design tier 2
      glow: "oklch(0.74 0.16 85 / 25%)",
      label: "Moderado",
    };
  }
  return {
    stroke: "oklch(0.63 0.24 28)", // red — design tier 3
    glow: "oklch(0.63 0.24 28 / 25%)",
    label: "Arriscado",
  };
}

function scoreBg(score: number) {
  if (score >= 70) {
    return "from-primary/10 to-transparent";
  }
  if (score >= 40) {
    return "from-amber-500/10 to-transparent";
  }
  return "from-destructive/10 to-transparent";
}

export function ScoreGauge({ score, confidence }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const { stroke, label } = scoreColor(score);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1400;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 4;
      setAnimatedScore(Math.round(eased * score));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const radius = 82;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const progress = (animatedScore / 100) * arcLength;

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl bg-gradient-to-b ${scoreBg(score)} p-6`}
    >
      <svg
        className="drop-shadow-lg"
        height="175"
        viewBox="0 0 200 195"
        width="200"
      >
        <title>{`Score ${score} — ${label}`}</title>
        <defs>
          <filter height="140%" id="scoreGlow" width="140%" x="-20%" y="-20%">
            <feGaussianBlur result="blur" stdDeviation="4" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="arcGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.6" />
            <stop offset="100%" stopColor={stroke} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx="100"
          cy="100"
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          strokeOpacity={0.06}
          strokeWidth={strokeWidth}
          transform="rotate(135 100 100)"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = 135 + (tick / 100) * 270;
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + (radius - 16) * Math.cos(rad);
          const y1 = 100 + (radius - 16) * Math.sin(rad);
          const x2 = 100 + (radius - 12) * Math.cos(rad);
          const y2 = 100 + (radius - 12) * Math.sin(rad);
          return (
            <line
              key={tick}
              stroke="currentColor"
              strokeLinecap="round"
              strokeOpacity={0.15}
              strokeWidth={1.5}
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          );
        })}

        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          fill="none"
          filter="url(#scoreGlow)"
          r={radius}
          stroke="url(#arcGradient)"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ transition: "stroke-dasharray 0.3s ease-out" }}
          transform="rotate(135 100 100)"
        />

        {/* Center glow */}

        {/* Score number */}
        <text
          className="fill-foreground font-bold"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-heading), sans-serif",
            fontSize: "2.5rem",
            letterSpacing: "-0.02em",
          }}
          textAnchor="middle"
          x="100"
          y="96"
        >
          {animatedScore}
        </text>

        {/* Label */}
        <text
          className="fill-muted-foreground"
          style={{
            fontFamily: "var(--font-heading), sans-serif",
            fontSize: "0.55rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
          textAnchor="middle"
          x="100"
          y="126"
        >
          {label}
        </text>

        {/* Confidence */}
        <text
          className="fill-muted-foreground"
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: "0.6rem",
          }}
          textAnchor="middle"
          x="100"
          y="148"
        >
          {Math.round(confidence * 100)}% confiança
        </text>
      </svg>
    </div>
  );
}
