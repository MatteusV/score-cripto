"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, WalletIcon } from "lucide-react"
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    if (!isValid) return

    const href = `/analyze?chain=${normalizeChainInput(chain)}&address=${address.trim()}`
    router.push(href)
  }

  return (
    <form onSubmit={handleSubmit}>
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
