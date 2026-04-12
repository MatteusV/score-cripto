"use client"

import { startTransition, useState } from "react"
import Link from "next/link"
import { ViewTransition } from "react"
import { EyeIcon, EyeOffIcon, LogInIcon, ShieldCheckIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", default: "none" }}
      default="none"
    >
      <div className="w-full max-w-md">
        <Card className="glass-panel glow-line overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheckIcon className="size-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">Acesso seguro</Badge>
            </div>
            <CardTitle className="text-2xl font-bold">Entrar na conta</CardTitle>
            <CardDescription>
              Acesse seu dashboard de análises on-chain.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel>Senha</FieldLabel>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </Field>

              {error && (
                <ViewTransition enter="slide-up" default="none">
                  <FieldError className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </FieldError>
                </ViewTransition>
              )}

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Entrando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogInIcon className="size-4" />
                    Entrar
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline underline-offset-4"
                onClick={() => startTransition(() => {})}
              >
                Criar conta grátis
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </ViewTransition>
  )
}
