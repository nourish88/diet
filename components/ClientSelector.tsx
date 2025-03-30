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
import FormFieldWrapper from "./CustomUI/FormFieldWrapper";
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
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
}

interface Client {
  id: number;
  name: string;
  surname: string;
}

const ClientSelector = ({
  onSelectClient,
  selectedClientId,
}: ClientSelectorProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    surname: "",
    phoneNumber: "",
  });
  const { getClients, createClient, isLoading } = useClientActions();
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const clientsData = await getClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.surname) {
      toast({
        title: "Hata",
        description: "Ad ve soyad alanları zorunludur",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createClient({
        name: newClient.name,
        surname: newClient.surname,
        phoneNumber: newClient.phoneNumber || null,
      });

      if (result && result.id) {
        toast({
          title: "Başarılı",
          description: "Yeni danışan başarıyla eklendi",
        });
        // Refresh the client list
        await fetchClients();
        // Select the newly created client
        onSelectClient(result.id);
        // Close the dialog
        setDialogOpen(false);
        // Reset form
        setNewClient({ name: "", surname: "", phoneNumber: "" });
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Hata",
        description: "Danışan oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const selectedClient = clients.find(
    (client) => client.id === selectedClientId
  );
  const displayText = selectedClient
    ? `${selectedClient.name} ${selectedClient.surname}`
    : "Danışan seçin";

  return (
    <FormFieldWrapper name="client" label="Danışan">
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mr-2" />
          <span>Danışanlar yükleniyor...</span>
        </div>
      ) : (
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full h-10 justify-between border-gray-300 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <div className="w-full text-left overflow-hidden text-ellipsis">
                  {displayText}
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Danışan ara..." />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-3 px-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Danışan bulunamadı.
                      </p>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center text-xs text-indigo-600"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Yeni Danışan Ekle
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Yeni Danışan Ekle</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="name" className="text-right">
                                Ad
                              </Label>
                              <Input
                                id="name"
                                value={newClient.name}
                                onChange={(e) =>
                                  setNewClient({
                                    ...newClient,
                                    name: e.target.value,
                                  })
                                }
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="surname" className="text-right">
                                Soyad
                              </Label>
                              <Input
                                id="surname"
                                value={newClient.surname}
                                onChange={(e) =>
                                  setNewClient({
                                    ...newClient,
                                    surname: e.target.value,
                                  })
                                }
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="phone" className="text-right">
                                Telefon
                              </Label>
                              <Input
                                id="phone"
                                value={newClient.phoneNumber}
                                onChange={(e) =>
                                  setNewClient({
                                    ...newClient,
                                    phoneNumber: e.target.value,
                                  })
                                }
                                className="col-span-3"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={handleCreateClient}
                              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                            >
                              Danışan Ekle
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      key="clear-selection"
                      value="clear"
                      onSelect={() => {
                        onSelectClient(null);
                        setOpen(false);
                      }}
                    >
                      <span className="text-gray-400 italic">
                        Seçimi Temizle
                      </span>
                    </CommandItem>

                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`${client.name.toLowerCase()} ${client.surname.toLowerCase()}`}
                        onSelect={() => {
                          onSelectClient(client.id);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">
                          {client.name} {client.surname}
                        </span>
                        <Check
                          className={cn(
                            "ml-auto",
                            selectedClientId === client.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Seçenekler">
                    <CommandItem
                      onSelect={() => {
                        setDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-2 text-emerald-600" />
                      <span>Yeni Danışan Ekle</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Yeni Danışan Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name-modal" className="text-right">
                    Ad
                  </Label>
                  <Input
                    id="name-modal"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="surname-modal" className="text-right">
                    Soyad
                  </Label>
                  <Input
                    id="surname-modal"
                    value={newClient.surname}
                    onChange={(e) =>
                      setNewClient({ ...newClient, surname: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone-modal" className="text-right">
                    Telefon
                  </Label>
                  <Input
                    id="phone-modal"
                    value={newClient.phoneNumber}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateClient}
                  className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                >
                  Danışan Ekle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </FormFieldWrapper>
  );
};

export default ClientSelector;
