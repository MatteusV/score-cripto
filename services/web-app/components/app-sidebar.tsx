"use client";

import {
  ClockIcon,
  CompassIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Nova análise", href: "/analyze", icon: SearchIcon },
  { label: "Histórico", href: "/history", icon: ClockIcon },
  { label: "Explorar", href: "/search", icon: CompassIcon },
];

const NAV_ACCOUNT = [
  {
    label: "Planos & Billing",
    href: "/settings/billing",
    icon: CreditCardIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, initials, planLabel, logout } = useUser();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-border border-r bg-sidebar px-4 py-6">
      {/* Logo */}
      <Link
        aria-label="Score Cripto"
        className="mb-8 flex items-center"
        href="/"
      >
        <Logo className="h-9 w-auto" variant="wordmark" />
      </Link>

      {/* Nav principal */}
      <NavSection items={NAV_MAIN} label="Principal" pathname={pathname} />

      {/* Nav conta */}
      <NavSection items={NAV_ACCOUNT} label="Conta" pathname={pathname} />

      {/* User row */}
      <div className="mt-auto">
        <button
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/5"
          onClick={() => void logout()}
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 font-bold font-heading text-primary text-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground text-sm">
              {user?.name ?? user?.email ?? "Usuário"}
            </p>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  user?.plan === "PRO" ? "bg-accent" : "bg-primary/60"
                )}
              />
              {planLabel}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
  }[];
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 font-semibold text-[10px] text-muted-dim uppercase tracking-[0.2em]">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-sm transition-all",
                active
                  ? "border border-primary/20 bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-current"
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-bold text-[10px] text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
