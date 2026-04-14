"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClockIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  SearchIcon,
  ShieldIcon,
} from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"

const NAV_MAIN = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Nova análise", href: "/analyze", icon: SearchIcon },
  { label: "Histórico", href: "/history", icon: ClockIcon },
]

const NAV_ACCOUNT = [
  { label: "Planos & Billing", href: "/settings/billing", icon: CreditCardIcon },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, initials, planLabel, logout } = useUser()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-sidebar px-4 py-6">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <ShieldIcon className="size-4 text-primary" strokeWidth={2.5} />
        </div>
        <span className="font-heading text-sm font-bold tracking-widest text-foreground">
          Score<span className="text-primary">Cripto</span>
        </span>
      </Link>

      {/* Nav principal */}
      <NavSection label="Principal" items={NAV_MAIN} pathname={pathname} />

      {/* Nav conta */}
      <NavSection label="Conta" items={NAV_ACCOUNT} pathname={pathname} />

      {/* User row */}
      <div className="mt-auto">
        <button
          onClick={() => void logout()}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/4"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 font-heading text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name ?? user?.email ?? "Usuário"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  user?.plan === "PRO" ? "bg-accent" : "bg-primary/60",
                )}
              />
              {planLabel}
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: { label: string; href: string; icon: React.ElementType; badge?: number }[]
  pathname: string
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted-dim uppercase">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "border border-primary/20 bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-white/4 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn("size-4 shrink-0", active ? "text-primary" : "text-current")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
