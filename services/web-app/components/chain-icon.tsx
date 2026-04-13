import { cn } from "@/lib/utils"

const CHAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ethereum:  { bg: "bg-blue-500/15",  text: "text-blue-400",  label: "ETH"   },
  bitcoin:   { bg: "bg-amber-500/15", text: "text-amber-400", label: "BTC"   },
  polygon:   { bg: "bg-purple-500/15",text: "text-purple-400",label: "MATIC" },
  solana:    { bg: "bg-green-500/15", text: "text-green-400", label: "SOL"   },
  arbitrum:  { bg: "bg-sky-500/15",   text: "text-sky-400",   label: "ARB"   },
  optimism:  { bg: "bg-red-500/15",   text: "text-red-400",   label: "OP"    },
  avalanche: { bg: "bg-red-500/15",   text: "text-red-400",   label: "AVAX"  },
}

interface ChainIconProps {
  chain: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ChainIcon({ chain, size = "md", className }: ChainIconProps) {
  const key = chain.toLowerCase()
  const config = CHAIN_COLORS[key] ?? { bg: "bg-white/10", text: "text-muted-foreground", label: chain.slice(0, 4).toUpperCase() }

  const sizes = { sm: "size-6 text-[9px]", md: "size-8 text-[10px]", lg: "size-10 text-xs" }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg font-heading font-bold",
        config.bg,
        config.text,
        sizes[size],
        className,
      )}
    >
      {config.label}
    </div>
  )
}
