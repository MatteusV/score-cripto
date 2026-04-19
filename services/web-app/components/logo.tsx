import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "mark" | "wordmark"
  className?: string
  ariaLabel?: string
}

export function Logo({ variant = "wordmark", className, ariaLabel = "Score Cripto" }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        fill="none"
        role="img"
        aria-label={ariaLabel}
        className={cn("size-10", className)}
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="12"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          fill="currentColor"
          fillOpacity="0.1"
          className="text-primary"
        />
        <path
          d="M20 10 L28 13 V20 C28 24.4 24.4 28 20 30 C15.6 28 12 24.4 12 20 V13 L20 10 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill="none"
          className="text-primary"
        />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 40"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={cn("h-10 w-auto", className)}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="12"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.1"
        className="text-primary"
      />
      <path
        d="M20 10 L28 13 V20 C28 24.4 24.4 28 20 30 C15.6 28 12 24.4 12 20 V13 L20 10 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
        className="text-primary"
      />
      <text
        x="52"
        y="26"
        fontFamily="var(--font-orbitron), Orbitron, monospace"
        fontWeight="700"
        fontSize="13"
        letterSpacing="2"
        fill="currentColor"
        className="text-foreground"
      >
        SCORE
      </text>
      <text
        x="114"
        y="26"
        fontFamily="var(--font-orbitron), Orbitron, monospace"
        fontWeight="700"
        fontSize="13"
        letterSpacing="2"
        fill="currentColor"
        className="text-primary"
      >
        CRIPTO
      </text>
    </svg>
  )
}
