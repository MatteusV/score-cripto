"use client";

import { EyeIcon, EyeOffIcon, LogInIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { startTransition, useState, ViewTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ViewTransition
      default="none"
      enter={{ "nav-forward": "slide-from-right", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", default: "none" }}
    >
      <div className="w-full max-w-md">
        <Card className="glass-panel glow-line overflow-hidden">
          <CardHeader className="pb-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheckIcon className="size-5 text-primary" />
              </div>
              <Badge className="text-xs" variant="secondary">
                {t("badge")}
              </Badge>
            </div>
            <CardTitle className="font-bold text-2xl">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                handleSubmit(e).catch(() => {
                  // handleSubmit surfaces errors via local state
                });
              }}
            >
              <Field>
                <FieldLabel>{t("email")}</FieldLabel>
                <Input
                  autoComplete="email"
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  type="email"
                  value={email}
                />
              </Field>

              <Field>
                <FieldLabel>{t("password")}</FieldLabel>
                <div className="relative">
                  <Input
                    autoComplete="current-password"
                    className="pr-10"
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </Field>

              {error && (
                <ViewTransition default="none" enter="slide-up">
                  <FieldError className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
                    {error}
                  </FieldError>
                </ViewTransition>
              )}

              <Button
                className="w-full cursor-pointer"
                disabled={loading}
                size="lg"
                type="submit"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("submitting")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogInIcon className="size-4" />
                    {t("submit")}
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-muted-foreground text-sm">
              {t("noAccount")}{" "}
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/register"
                onClick={() =>
                  startTransition(() => {
                    // trigger route transition only
                  })
                }
              >
                {t("createAccount")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </ViewTransition>
  );
}
