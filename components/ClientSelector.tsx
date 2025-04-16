import { useState } from "react";
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

interface Client {
  id: number;
  name: string;
  surname: string;
}

interface ClientSelectorProps {
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
  isLoading?: boolean;
  clients: Client[];
}

const ClientSelector = ({
  onSelectClient,
  selectedClientId,
  isLoading = false,
  clients = [],
}: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);

  const getSelectedClientName = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? `${client.name} ${client.surname}` : "Danışan seçin";
  };

  return (
    <div className="w-full space-y-2">
      <Label htmlFor="client-select">Danışan Seçin</Label>
      {isLoading ? (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Danışanlar yükleniyor...</span>
        </div>
      ) : (
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
            <Command>
              <CommandInput placeholder="Danışan ara..." />
              <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>Danışan bulunamadı.</CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`${client.name} ${client.surname}`}
                      onSelect={() => {
                        onSelectClient(client.id);
                        setOpen(false);
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default ClientSelector;
