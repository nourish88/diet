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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface ClientSelectorProps {
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
  isLoading?: boolean;
  clients?: Array<{ id: number; name: string; surname: string }>;
}

const ClientSelector = ({
  onSelectClient,
  selectedClientId,
  isLoading = false,
  clients = []
}: ClientSelectorProps) => {
  return (
    <div className="w-full space-y-2">
      <Label htmlFor="client-select">Danışan Seçin</Label>
      {isLoading ? (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Danışanlar yükleniyor...</span>
        </div>
      ) : (
        <Select
          value={selectedClientId?.toString()}
          onValueChange={(value) => onSelectClient(value ? Number(value) : null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Danışan seçin" />
          </SelectTrigger>
          <SelectContent>
            {clients.length === 0 ? (
              <SelectItem value="no-clients" disabled>
                Danışan bulunamadı
              </SelectItem>
            ) : (
              clients.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {`${client.name} ${client.surname}`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default ClientSelector;
