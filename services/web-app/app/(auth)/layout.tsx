import Link from "next/link"
import { ViewTransition } from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Fundo decorativo */}
      <div className="hero-aurora pointer-events-none fixed inset-0 opacity-40" />
      <div className="hero-grid pointer-events-none fixed inset-0 opacity-20" />

      <header className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm text-xs font-bold tracking-[0.2em] text-primary transition-colors group-hover:border-primary/40">
            SC
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">Score Cripto</p>
            <p className="text-xs text-muted-foreground">Confiança on-chain</p>
          </div>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <ViewTransition>
          {children}
        </ViewTransition>
      </main>

      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          Score Cripto — análise de confiabilidade on-chain
        </p>
      </footer>
    </div>
  )
}
