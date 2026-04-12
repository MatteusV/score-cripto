"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, ArrowUpRightIcon, WalletIcon, ZapOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_CHAINS, normalizeChainInput } from "@/lib/query"

const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/

export function WalletIntakeForm() {
  const router = useRouter()
  const [chain, setChain] = useState("ethereum")
  const [address, setAddress] = useState("")
  const [touched, setTouched] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  const errorMessage = useMemo(() => {
    if (!touched) return null

    if (!address.trim()) {
      return "Cole um endereço EVM para iniciar a análise."
    }

    if (!evmAddressPattern.test(address.trim())) {
      return "Endereço inválido. Use formato 0x com 40 caracteres hex."
    }

    return null
  }, [address, touched])

  const isValid = address.trim() && evmAddressPattern.test(address.trim())

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    setLimitReached(false)

    if (!isValid) return

    // Pre-check usage before navigating
    const checkRes = await fetch("/api/billing/usage-check", { method: "POST" }).catch(() => null)
    if (checkRes?.status === 429) {
      setLimitReached(true)
      return
    }

    const href = `/analyze?chain=${normalizeChainInput(chain)}&address=${address.trim()}`
    router.push(href)
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="chain">Rede</FieldLabel>
          <Select value={chain} onValueChange={setChain}>
            <SelectTrigger id="chain" className="w-full cursor-pointer">
              <SelectValue placeholder="Selecione a rede" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SUPPORTED_CHAINS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Redes EVM suportadas pelo pipeline atual.
          </FieldDescription>
        </Field>

        <Field data-invalid={Boolean(errorMessage)}>
          <FieldLabel htmlFor="address">Endereço da carteira</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <WalletIcon className="size-4 text-primary/60" />
            </InputGroupAddon>
            <InputGroupInput
              id="address"
              aria-invalid={Boolean(errorMessage)}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="0x1234...abcd"
              spellCheck={false}
              autoComplete="off"
              className="font-mono text-sm"
            />
          </InputGroup>
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
        </Field>

        {limitReached && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
            <ZapOffIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Limite mensal atingido</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Você usou todas as análises do seu plano este mês.{" "}
                <Link
                  href="/settings/billing"
                  className="font-medium text-primary hover:underline underline-offset-2 inline-flex items-center gap-0.5"
                >
                  Fazer upgrade
                  <ArrowUpRightIcon className="size-3" />
                </Link>
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full cursor-pointer transition-all md:w-fit"
          disabled={touched && !isValid}
        >
          <ArrowRightIcon data-icon="inline-end" />
          Analisar
        </Button>
      </FieldGroup>
    </form>
  )
}
