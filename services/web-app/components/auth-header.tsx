"use client";

import { CreditCardIcon, LogOutIcon, UserIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { startTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function AuthHeader() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild className="cursor-pointer" size="sm" variant="ghost">
          <Link href="/login" onClick={() => startTransition(() => {})}>
            Entrar
          </Link>
        </Button>
        <Button asChild className="cursor-pointer" size="sm">
          <Link href="/register" onClick={() => startTransition(() => {})}>
            Criar conta
          </Link>
        </Button>
      </div>
    );
  }

  const remaining = user.analysisLimit - user.analysisCount;
  const pct = user.analysisCount / user.analysisLimit;
  const usageColor =
    pct >= 0.9
      ? "text-destructive border-destructive/30"
      : pct >= 0.7
        ? "text-chart-1 border-chart-1/30"
        : "text-primary border-primary/30";

  return (
    <div className="flex items-center gap-2">
      {/* Usage pill */}
      <Badge
        className={`hidden items-center gap-1.5 text-xs sm:flex ${usageColor}`}
        variant="outline"
      >
        <ZapIcon className="size-3" />
        {remaining} restante{remaining === 1 ? "" : "s"}
      </Badge>

      <Button
        asChild
        className="hidden cursor-pointer sm:flex"
        size="sm"
        variant="ghost"
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
        className="cursor-pointer"
        size="sm"
        title={user.email}
        variant="ghost"
      >
        <Link
          href="/settings/billing"
          onClick={() => startTransition(() => {})}
        >
          <UserIcon className="size-4" />
          <span className="hidden max-w-[120px] truncate sm:inline">
            {user.name ?? user.email.split("@")[0]}
          </span>
        </Link>
      </Button>

      <Button
        className="cursor-pointer text-muted-foreground hover:text-destructive"
        onClick={() => void logout()}
        size="sm"
        title="Sair"
        variant="ghost"
      >
        <LogOutIcon className="size-4" />
      </Button>
    </div>
  );
}
