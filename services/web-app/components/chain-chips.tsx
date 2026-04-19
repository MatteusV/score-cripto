"use client"

import { cn } from "@/lib/utils"

const CHAINS = [
  { id: "ethereum",  label: "ETH"   },
  { id: "bitcoin",   label: "BTC"   },
  { id: "polygon",   label: "MATIC" },
  { id: "solana",    label: "SOL"   },
  { id: "arbitrum",  label: "ARB"   },
  { id: "optimism",  label: "OP"    },
  { id: "avalanche", label: "AVAX"  },
]

interface ChainChipsProps {
  selected: string
  onChange: (chain: string) => void
  chains?: { id: string; label: string }[]
}

export function ChainChips({ selected, onChange, chains = CHAINS }: ChainChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chains.map((chain) => (
        <button
          key={chain.id}
          onClick={() => onChange(chain.id)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-bold tracking-wider transition-all",
            selected === chain.id
              ? "border border-primary/30 bg-primary/15 text-primary shadow-[0_0_8px_oklch(0.74_0.19_66/20%)]"
              : "border border-border text-muted-foreground hover:border-foreground/15 hover:text-foreground",
          )}
        >
          {chain.label}
        </button>
      ))}
    </div>
  )
}
