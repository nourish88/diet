"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchableNavigationItems } from "@/lib/dietitian-navigation";
import { fetchClients } from "@/services/ClientService";

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["global-client-search", debouncedQuery],
    queryFn: () => fetchClients({ search: debouncedQuery, take: 8 }),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const matchingActions = useMemo(() => {
    const normalized = query.toLocaleLowerCase("tr-TR").trim();
    if (!normalized) return searchableNavigationItems;
    return searchableNavigationItems.filter((item) =>
      [item.label, item.group, ...(item.keywords ?? [])]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(normalized),
    );
  }, [query]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-9 justify-center px-0 lg:w-56 lg:justify-start lg:px-3"
        onClick={() => setOpen(true)}
        aria-label="Danışan veya işlem ara"
      >
        <Search className="h-4 w-4 lg:mr-2" />
        <span className="hidden flex-1 text-left text-muted-foreground lg:inline">
          Danışan veya işlem ara
        </span>
        <span className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
          ⌘K
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Danışan adı, telefon veya işlem yazın..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Danışanlar aranıyor
            </div>
          )}
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

          {data?.clients && data.clients.length > 0 && (
            <CommandGroup heading="Danışanlar">
              {data.clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`danisan-${client.id}-${client.name}-${client.surname}-${client.phoneNumber ?? ""}`}
                  onSelect={() => navigate(`/clients/${client.id}`)}
                >
                  <UserRound />
                  <span>{client.name} {client.surname}</span>
                  {client.phoneNumber && (
                    <span className="ml-auto text-xs text-muted-foreground">{client.phoneNumber}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {matchingActions.length > 0 && (
            <CommandGroup heading="İşlemler">
              {matchingActions.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={`${item.group}-${item.href}`}
                    value={`${item.group}-${item.label}-${item.href}`}
                    onSelect={() => navigate(item.href)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.group}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
