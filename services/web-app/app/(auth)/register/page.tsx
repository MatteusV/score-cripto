"use client";

import { EyeIcon, EyeOffIcon, SparklesIcon, UserPlusIcon } from "lucide-react";
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

export default function RegisterPage() {
  const { register } = useAuth();
  const t = useTranslations("auth.register");
  const [name, setName] = useState("");
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
      await register(email, password, name || undefined);
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
              <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/10">
                <SparklesIcon className="size-5 text-accent" />
              </div>
              <Badge
                className="border-accent/30 text-accent text-xs"
                variant="outline"
              >
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
                void handleSubmit(e);
              }}
            >
              <Field>
                <FieldLabel>
                  {t("name")}{" "}
                  <span className="text-muted-foreground/60 text-xs">
                    {t("nameOptional")}
                  </span>
                </FieldLabel>
                <Input
                  autoComplete="name"
                  disabled={loading}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  type="text"
                  value={name}
                />
              </Field>

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
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={loading}
                    minLength={8}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
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
                    <UserPlusIcon className="size-4" />
                    {t("submit")}
                  </span>
                )}
              </Button>

              <p className="text-center text-muted-foreground/60 text-xs">
                {t("terms")}
              </p>
            </form>

            <p className="mt-4 text-center text-muted-foreground text-sm">
              {t("hasAccount")}{" "}
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/login"
                onClick={() => startTransition(() => {})}
              >
                {t("login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </ViewTransition>
  );
}
