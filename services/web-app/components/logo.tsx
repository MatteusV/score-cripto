import { cn } from "@/lib/utils";

interface LogoProps {
  ariaLabel?: string;
  className?: string;
  variant?: "mark" | "wordmark";
}

export function Logo({
  variant = "wordmark",
  className,
  ariaLabel = "Score Cripto",
}: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        aria-label={ariaLabel}
        className={cn("size-10", className)}
        fill="none"
        role="img"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          className="text-primary"
          fill="currentColor"
          fillOpacity="0.1"
          height="38"
          rx="12"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          width="38"
          x="1"
          y="1"
        />
        <path
          className="text-primary"
          d="M20 10 L28 13 V20 C28 24.4 24.4 28 20 30 C15.6 28 12 24.4 12 20 V13 L20 10 Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-label={ariaLabel}
      className={cn("h-10 w-auto", className)}
      fill="none"
      role="img"
      viewBox="0 0 200 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        className="text-primary"
        fill="currentColor"
        fillOpacity="0.1"
        height="38"
        rx="12"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        width="38"
        x="1"
        y="1"
      />
      <path
        className="text-primary"
        d="M20 10 L28 13 V20 C28 24.4 24.4 28 20 30 C15.6 28 12 24.4 12 20 V13 L20 10 Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <text
        className="text-foreground"
        fill="currentColor"
        fontFamily="var(--font-orbitron), Orbitron, monospace"
        fontSize="13"
        fontWeight="700"
        letterSpacing="2"
        x="52"
        y="26"
      >
        SCORE
      </text>
      <text
        className="text-primary"
        fill="currentColor"
        fontFamily="var(--font-orbitron), Orbitron, monospace"
        fontSize="13"
        fontWeight="700"
        letterSpacing="2"
        x="114"
        y="26"
      >
        CRIPTO
      </text>
    </svg>
  );
}
