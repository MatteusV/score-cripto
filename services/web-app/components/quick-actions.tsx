"use client";

import {
  ArrowUpRightIcon,
  ClipboardListIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface QuickActionsProps {
  address: string;
  chain: string;
}

export function QuickActions({ chain, address }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const actions = useMemo(
    () => [
      {
        label: "Nova consulta",
        shortcut: "N",
        onSelect: () => router.push("/"),
        icon: SearchIcon,
      },
      {
        label: "Abrir shell vazio",
        shortcut: "S",
        onSelect: () =>
          router.push(
            "/analyze?chain=ethereum&address=0x0000000000000000000000000000000000000000"
          ),
        icon: ClipboardListIcon,
      },
      {
        label: `Duplicar ${chain}:${address}`,
        shortcut: "D",
        onSelect: () =>
          router.push(`/analyze?chain=${chain}&address=${address}`),
        icon: SparklesIcon,
      },
    ],
    [address, chain, router]
  );

  return (
    <>
      <Button
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        variant="outline"
      >
        <ArrowUpRightIcon data-icon="inline-start" />
        Ações rapidas
      </Button>
      <CommandDialog
        description="Atalhos do primeiro shell do web-app."
        onOpenChange={setOpen}
        open={open}
        title="Ações rapidas"
      >
        <Command>
          <CommandInput placeholder="Buscar acao..." />
          <CommandList>
            <CommandEmpty>Nenhuma acao encontrada.</CommandEmpty>
            <CommandGroup heading="Navegacao">
              {actions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                >
                  <action.icon />
                  {action.label}
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
