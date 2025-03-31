import { useState, useEffect } from "react";
import useClientActions from "@/hooks/useClientActions";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  PlusCircle,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";

interface ClientSelectorProps {
  onSelectClient: (clientId: number) => void;
  selectedClientId: number | null;
}

const ClientSelector = ({ onSelectClient, selectedClientId }: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: number; name: string; surname: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientActions = useClientActions();
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const fetchedClients = await clientActions.getClients();
        if (fetchedClients) {
          setClients(fetchedClients);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Hata",
          description: "Danışanlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="flex items-center space-x-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedClientId ? (
              clients.find((client) => client.id === selectedClientId)?.name +
              " " +
              clients.find((client) => client.id === selectedClientId)?.surname
            ) : (
              "Danışan seçin..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Danışan ara..." />
            <CommandList>
              <CommandEmpty>Danışan bulunamadı.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    onSelect={() => {
                      onSelectClient(client.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedClientId === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {client.name} {client.surname}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ClientSelector;
