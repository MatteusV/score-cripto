"use client"

import Link from "next/link"
import { startTransition } from "react"
import { CreditCardIcon, LogOutIcon, UserIcon, ZapIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AuthHeader() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer">
          <Link
            href="/login"
            onClick={() => startTransition(() => {})}
          >
            Entrar
          </Link>
        </Button>
        <Button asChild size="sm" className="cursor-pointer">
          <Link
            href="/register"
            onClick={() => startTransition(() => {})}
          >
            Criar conta
          </Link>
        </Button>
      </div>
    )
  }

  const remaining = user.analysisLimit - user.analysisCount
  const pct = user.analysisCount / user.analysisLimit
  const usageColor =
    pct >= 0.9
      ? "text-destructive border-destructive/30"
      : pct >= 0.7
        ? "text-chart-1 border-chart-1/30"
        : "text-primary border-primary/30"

  return (
    <div className="flex items-center gap-2">
      {/* Usage pill */}
      <Badge
        variant="outline"
        className={`hidden sm:flex items-center gap-1.5 text-xs ${usageColor}`}
      >
        <ZapIcon className="size-3" />
        {remaining} restante{remaining !== 1 ? "s" : ""}
      </Badge>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="cursor-pointer hidden sm:flex"
      >
        <Link
          href="/settings/billing"
          onClick={() => startTransition(() => {})}
        >
          <CreditCardIcon className="size-4" />
          {user.plan === "PRO" ? "Pro" : "Plano"}
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="cursor-pointer"
        title={user.email}
      >
        <Link href="/settings/billing" onClick={() => startTransition(() => {})}>
          <UserIcon className="size-4" />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {user.name ?? user.email.split("@")[0]}
          </span>
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer text-muted-foreground hover:text-destructive"
        onClick={() => void logout()}
        title="Sair"
      >
        <LogOutIcon className="size-4" />
      </Button>
    </div>
  )
}
