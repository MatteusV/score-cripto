import Link from "next/link"
import { BellIcon, ZapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

interface TopbarProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  showUpgrade?: boolean
}

export function Topbar({ title, subtitle, children, showUpgrade = false }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div>
        <h1 className="font-heading text-base font-bold tracking-wider text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {children}

        <ThemeToggle />
        <LocaleSwitcher />

        {showUpgrade && (
          <Button
            asChild
            size="sm"
            className="cursor-pointer gap-1.5 border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:shadow-[0_0_15px_oklch(0.74_0.19_66/30%)]"
            variant="ghost"
          >
            <Link href="/settings/billing">
              <ZapIcon className="size-3.5" strokeWidth={2.5} />
              Upgrade Pro
            </Link>
          </Button>
        )}

        <button className="relative flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-foreground/15 hover:text-foreground">
          <BellIcon className="size-4" strokeWidth={1.75} />
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
            2
          </span>
        </button>
      </div>
    </header>
  )
}
