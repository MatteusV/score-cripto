"use client"

import { startTransition, useState } from "react"
import Link from "next/link"
import { ViewTransition } from "react"
import { EyeIcon, EyeOffIcon, SparklesIcon, UserPlusIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState("")
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
      await register(email, password, name || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no registro")
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
              <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/10">
                <SparklesIcon className="size-5 text-accent" />
              </div>
              <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                FREE_TIER — 5 análises/mês
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
            <CardDescription>
              Comece a analisar carteiras gratuitamente. Sem cartão de crédito.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
              <Field>
                <FieldLabel>Nome <span className="text-muted-foreground/60 text-xs">(opcional)</span></FieldLabel>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </Field>

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
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
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
                    Criando conta…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlusIcon className="size-4" />
                    Criar conta grátis
                  </span>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground/60">
                Ao criar uma conta, você concorda com os termos de uso.
              </p>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline underline-offset-4"
                onClick={() => startTransition(() => {})}
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </ViewTransition>
  )
}
