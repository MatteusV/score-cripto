"use client";

import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  WalletIcon,
  ZapOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeChainInput, SUPPORTED_CHAINS } from "@/lib/query";

const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export function WalletIntakeForm() {
  const t = useTranslations("walletForm");
  const router = useRouter();
  const [chain, setChain] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const errorMessage = useMemo(() => {
    if (!touched) {
      return null;
    }
    if (!address.trim()) {
      return t("errors.empty");
    }
    if (!evmAddressPattern.test(address.trim())) {
      return t("errors.invalid");
    }
    return null;
  }, [address, touched, t]);

  const isValid = address.trim() && evmAddressPattern.test(address.trim());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setLimitReached(false);

    if (!isValid) {
      return;
    }

    // Pre-check usage before navigating
    const checkRes = await fetch("/api/billing/usage-check", {
      method: "POST",
    }).catch(() => null);
    if (checkRes?.status === 429) {
      setLimitReached(true);
      return;
    }

    const href = `/analyze?chain=${normalizeChainInput(chain)}&address=${address.trim()}`;
    router.push(href);
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="chain">{t("network")}</FieldLabel>
          <Select onValueChange={setChain} value={chain}>
            <SelectTrigger className="w-full cursor-pointer" id="chain">
              <SelectValue placeholder={t("networkPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SUPPORTED_CHAINS.map((option) => (
                  <SelectItem
                    className="cursor-pointer"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>{t("networkDesc")}</FieldDescription>
        </Field>

        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="address">{t("address")}</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <WalletIcon className="size-4 text-primary/60" />
            </InputGroupAddon>
            <InputGroupInput
              aria-invalid={Boolean(errorMessage)}
              autoComplete="off"
              className="font-mono text-sm"
              id="address"
              onBlur={() => setTouched(true)}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="0x1234...abcd"
              spellCheck={false}
              value={address}
            />
          </InputGroup>
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
        </Field>

        {limitReached && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
            <ZapOffIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive text-sm">
                {t("limitReached.title")}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {t("limitReached.desc")}{" "}
                <Link
                  className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                  href="/settings/billing"
                >
                  {t("limitReached.upgrade")}
                  <ArrowUpRightIcon className="size-3" />
                </Link>
              </p>
            </div>
          </div>
        )}

        <Button
          className="w-full cursor-pointer transition-all md:w-fit"
          disabled={touched && !isValid}
          size="lg"
          type="submit"
        >
          <ArrowRightIcon data-icon="inline-end" />
          {t("analyze")}
        </Button>
      </FieldGroup>
    </form>
  );
}
