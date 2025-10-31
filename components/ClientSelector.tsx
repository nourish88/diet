import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface Client {
  id: number;
  name: string;
  surname: string;
}

interface ClientSelectorProps {
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
  selectedClientName?: string; // To show selected client name without fetching
}

const ClientSelector = ({
  onSelectClient,
  selectedClientId,
  selectedClientName,
}: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const getSelectedClientName = () => {
    if (selectedClientName) return selectedClientName;
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? `${client.name} ${client.surname}` : "Danışan ara...";
  };

  // Debounced search function
  const searchClients = useCallback(async (search: string) => {
    if (!search || search.length < 2) {
      setClients([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error("Authentication required");
        return;
      }
      
      const response = await fetch(`/api/clients?search=${encodeURIComponent(search)}&take=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to search clients");
      }
      
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClients([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(searchValue);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchValue, searchClients]);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="client-select">Danışan Seçin</Label>
        {clients.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {clients.length} sonuç
          </span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {getSelectedClientName()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Danışan adı veya soyadı yazın (min 2 karakter)..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Aranıyor...</span>
                </div>
              ) : searchValue.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Aramak için en az 2 karakter yazın
                </div>
              ) : clients.length === 0 ? (
                <CommandEmpty>Danışan bulunamadı.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.name} ${client.surname}`}
                      onSelect={() => {
                        onSelectClient(client.id);
                        setOpen(false);
                        setSearchValue("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientId === client.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {client.name} {client.surname}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {client.id}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ClientSelector;
