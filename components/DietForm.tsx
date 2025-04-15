"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "./ui/form";
import DietHeader from "./DietHeader";
import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { formSchema } from "../schemas/formSchema";
import { Diet, Ogun, Birim, Besin } from "../types/types";
import { OGUN, initialDiet } from "../models/dietModels";
import DietTable from "./DietTable";
import DietFormActions from "./DietFormActions";
import DietFormBasicFields from "./DietFormBasicFields";
import { useDietActions } from "@/hooks/useDietActions";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import ClientSelector from "./ClientSelector";
import { useFontStore } from "@/store/store";
import ClientWarnings from "./ClientWarnings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface DietFormProps {
  initialClientId?: number;
}

const DietForm = ({ initialClientId }: DietFormProps) => {
  const [diet, setDiet] = useState<Diet>({
    ...initialDiet,
  });
  const [clients, setClients] = useState<
    Array<{ id: number; name: string; surname: string }>
  >([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null
  );
  const [clientData, setClientData] = useState<{
    illness: string | null;
    bannedFoods: any[];
  }>({
    illness: null,
    bannedFoods: [],
  });
  const contextId = "0";

  const { toast } = useToast();
  const { saveDiet } = useDietActions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  const { fontSize } = useFontStore();

  // Add state for loading
  const [isLoading, setIsLoading] = useState(false);

  // Separate effect for initial client fetch if initialClientId is provided
  useEffect(() => {
    const fetchInitialClient = async () => {
      if (!initialClientId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/clients/${initialClientId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch client");
        }

        if (data.client) {
          setClients((prevClients) => {
            const clientExists = prevClients.some(
              (c) => c.id === data.client.id
            );
            if (!clientExists) {
              return [
                ...prevClients,
                {
                  id: data.client.id,
                  name: data.client.name,
                  surname: data.client.surname,
                },
              ];
            }
            return prevClients;
          });
          setSelectedClientId(data.client.id);

          // Set client data here instead of in a separate effect
          setClientData({
            illness: data.client.illness,
            bannedFoods: data.client.bannedFoods || [],
          });
          const phone = data.client.phoneNumber
            ? "+90" + data.client.phoneNumber
            : undefined;
          setClientPhoneNumber(phone);
        }
      } catch (error) {
        console.error("Error fetching initial client:", error);
        toast({
          title: "Hata",
          description: "Danışan bilgileri yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialClient();
  }, [initialClientId]);

  // Existing effect for fetching all clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/clients");
        if (!response.ok) {
          throw new Error("Failed to fetch clients");
        }
        const data = await response.json();

        if (Array.isArray(data)) {
          setClients((currentClients) => {
            // Merge with existing clients, avoiding duplicates
            const newClients = [...currentClients];
            data.forEach((client) => {
              if (!newClients.some((c) => c.id === client.id)) {
                newClients.push(client);
              }
            });
            return newClients;
          });
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Hata",
          description: "Danışan listesi yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  // Add this to your state
  const [clientPhoneNumber, setClientPhoneNumber] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (selectedClientId) {
      // Validate client ID first
      if (isNaN(selectedClientId)) {
        toast({
          title: "Hata",
          description: "Geçersiz danışan ID'si",
          variant: "destructive",
        });
        setSelectedClientId(null);
        return;
      }

      const selectedClient = clients.find((c) => c.id === selectedClientId);

      if (!selectedClient) {
        // Don't show toast here as it might be still loading
        return;
      }

      // Only proceed with setting diet and fetching data if client is valid
      setDiet((prev) => ({
        ...prev,
        AdSoyad: getClientFullName(selectedClientId),
      }));

      // Load latest diet for this client
      loadLatestDiet();
    } else {
      console.log("selected client id is null");
      setClientPhoneNumber(undefined);
      setClientData({ illness: null, bannedFoods: [] });
    }
  }, [selectedClientId, clients]);

  // Function to load the latest diet for a selected client
  const loadLatestDiet = async () => {
    if (!selectedClientId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/diets/latest/${selectedClientId}`);

      // Log the response for debugging
      console.log("Latest diet response status:", response.status);
      const data = await response.json();
      console.log("Latest diet response data:", data);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No previous diet found for client");
          // Initialize with empty diet instead of showing error
          setDiet((prev) => ({
            ...prev,
            Oguns: OGUN,
          }));
          return;
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.diet) {
        console.log("Found latest diet:", data.diet);
        const uiDiet = convertDbDietToUiDiet(data.diet);
        setDiet(uiDiet);
        toast({
          title: "Bilgi",
          description: "Danışanın son diyeti yüklendi.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading latest diet:", error);
      // Initialize with empty diet on error
      setDiet((prev) => ({
        ...prev,
        Oguns: OGUN,
      }));

      // Check if it's a network error
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast({
          title: "Bağlantı Hatası",
          description:
            "Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Hata",
        description:
          "Son diyet yüklenirken bir hata oluştu. Yeni bir diyet oluşturabilirsiniz.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to convert database diet format to UI diet format
  const convertDbDietToUiDiet = (dbDiet: any): Diet => {
    try {
      return {
        id: dbDiet.id,
        AdSoyad: getClientFullName(selectedClientId),
        Tarih: dbDiet.createdAt || new Date().toISOString(),
        Hedef: dbDiet.target || "",
        Sonuc: dbDiet.weeklyResult || "",
        dietitianNote: dbDiet.dietitianNote || "",
        isBirthdayCelebration: dbDiet.isBirthdayCelebration || false,
        isImportantDateCelebrated: dbDiet.isImportantDateCelebrated || false,
        importantDateId: dbDiet.importantDateId || null,
        importantDateName: dbDiet.importantDateName || null,
        Oguns:
          dbDiet.oguns?.map((dbOgun: any) => ({
            name: dbOgun.name || "",
            time: dbOgun.time || "",
            detail: dbOgun.detail || "",
            order: dbOgun.order || 0,
            items:
              dbOgun.items?.map((dbItem: any) => ({
                miktar: dbItem.miktar || "",
                birim: dbItem.birim || {},
                besin: dbItem.besin || {},
              })) || [],
          })) || OGUN,
        Su: dbDiet.waterConsumption || "",
        Fizik: dbDiet.physicalActivity || "",
      };
    } catch (error) {
      console.error("Error converting DB diet to UI diet:", error);
      // Return a default diet structure
      return {
        id: 0,
        AdSoyad: getClientFullName(selectedClientId),
        Tarih: new Date().toISOString(),
        Hedef: "",
        Sonuc: "",
        dietitianNote: "",
        isBirthdayCelebration: false,
        isImportantDateCelebrated: false,
        importantDateId: null,
        importantDateName: null,
        Oguns: OGUN,
        Su: "",
        Fizik: "",
      };
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  const handleAddOgun = () => {
    const newOgun: Ogun = {
      name: "",
      time: "",
      items: [],
      detail: "", // Now matches the interface
      order: diet.Oguns.length + 1,
    };
    setDiet((prev) => ({
      ...prev,
      Oguns: [...prev.Oguns, newOgun],
    }));
  };

  const handleRemoveOgun = (index: number) => {
    setDiet((prev) => ({
      ...prev,
      Oguns: prev.Oguns.filter((_, idx) => idx !== index),
    }));
  };

  const handleOgunChange = (
    index: number,
    field: keyof Ogun,
    value: string
  ) => {
    setDiet((prev) => ({
      ...prev,
      Oguns: prev.Oguns.map((ogun, idx) =>
        idx === index ? { ...ogun, [field]: value } : ogun
      ),
    }));
  };

  // Check how menu items are being added
  const handleAddMenuItem = (ogunIndex: number) => {
    setDiet((prev) => ({
      ...prev,
      Oguns: prev.Oguns.map((ogun, idx) =>
        idx === ogunIndex
          ? {
              ...ogun,
              items: [
                ...ogun.items,
                { birim: {} as Birim, miktar: "", besin: {} as Besin },
              ],
            }
          : ogun
      ),
    }));
  };

  const handleMenuItemChange = (
    ogunIndex: number,
    itemIndex: number,
    field: string,
    value: string
  ) => {
    if (field === "besin" && selectedClientId) {
      // Type the banned foods properly
      interface BannedFood {
        besin: {
          name: string;
          [key: string]: any;
        };
      }

      // Check if the selected food is banned for this client
      const isBanned = clientData.bannedFoods.some(
        (banned: BannedFood) => banned.besin.name === value
      );
      if (isBanned) {
        toast({
          title: "Uyarı",
          description: "Bu besin danışan için yasaklı listesinde!",
          variant: "destructive",
        });
        return;
      }
    }

    setDiet((prev) => {
      const newDiet = {
        ...prev,
        Oguns: prev.Oguns.map((ogun, idx) =>
          idx === ogunIndex
            ? {
                ...ogun,
                items: ogun.items.map((item, itemIdx) =>
                  itemIdx === itemIndex ? { ...item, [field]: value } : item
                ),
              }
            : ogun
        ),
      };

      return newDiet;
    });
  };
  const generatePDF = async () => {
    const element = document.getElementById("content");
    console.log("Generating PDF with diet data:", diet);

    if (!element) {
      console.error("Element with id 'content' not found.");
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Adjust the image height to fit within A4 page height if necessary
    const pageHeight = 297; // A4 height in mm
    let heightLeft = imgHeight;
    let position = 0;

    if (heightLeft <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      while (heightLeft > 0) {
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position -= pageHeight;
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }
    }

    pdf.save("diet-plan.pdf");
  };

  const handleSaveToDB = async () => {
    if (!selectedClientId) {
      toast({
        title: "Hata",
        description: "Lütfen önce bir müşteri seçin",
        variant: "destructive",
      });
      return;
    }

    try {
      // Include all diet properties including celebration flags
      const dietToSave = {
        ...diet,
        Tarih: diet.Tarih ? new Date(diet.Tarih).toISOString() : null,
        clientId: selectedClientId,
        isBirthdayCelebration: diet.isBirthdayCelebration || false,
        isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
        importantDateId: diet.importantDateId || null,
        importantDateName: diet.importantDateName || null,
      };
      console.log(dietToSave, "dietToSave");
      const result = await saveDiet(dietToSave);

      if (result) {
        toast({
          title: "Başarılı",
          description: "Beslenme programı veritabanına kaydedildi.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Veritabanına kaydetme hatası:", error);
      toast({
        title: "Hata",
        description: "Veritabanına kaydetme sırasında bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Create a function to get client name
  const getClientFullName = (clientId: number | null) => {
    if (!clientId) return "İsimsiz Danışan";

    const client = clients.find((c) => c.id === clientId);
    if (!client) return "İsimsiz Danışan";

    return (
      `${client.name || ""} ${client.surname || ""}`.trim() || "İsimsiz Danışan"
    );
  };

  // Add this helper function to check if form should be disabled
  const isFormDisabled = !selectedClientId;

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div style={{ fontSize: `${fontSize}px` }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DietHeader />

            {/* Client selector with improved styling */}
            <div className="mb-4">
              <ClientSelector
                onSelectClient={(clientId) => setSelectedClientId(clientId)}
                selectedClientId={selectedClientId}
                isLoading={isLoading}
                clients={clients}
              />
            </div>

            {/* Update ClientWarnings component */}
            {selectedClientId && (
              <ClientWarnings
                illness={clientData.illness}
                bannedFoods={clientData.bannedFoods}
              />
            )}

            {/* Show a message when no client is selected */}
            {isFormDisabled && (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                <p className="text-yellow-700">
                  Lütfen diyet programı oluşturmak için önce bir danışan seçin
                </p>
              </div>
            )}

            {/* Wrap the rest of the form in a div that can be disabled */}
            <div
              className={isFormDisabled ? "opacity-50 pointer-events-none" : ""}
            >
              <div className="mb-8">
                <DietFormBasicFields
                  form={form}
                  diet={diet}
                  setDiet={(newDiet) => {
                    const isDate = (value: any): value is Date =>
                      value &&
                      Object.prototype.toString.call(value) ===
                        "[object Date]" &&
                      !isNaN(value);

                    setDiet({
                      ...newDiet,
                      Tarih: isDate(newDiet.Tarih)
                        ? newDiet.Tarih.toISOString()
                        : newDiet.Tarih,
                    });
                  }}
                  selectedClientId={selectedClientId}
                  onSelectClient={(clientId) => setSelectedClientId(clientId)}
                  disabled={isFormDisabled}
                />
              </div>

              <div id="content" className="mb-8">
                <DietTable
                  setDiet={setDiet}
                  diet={diet}
                  contextId={contextId}
                  fontSize={fontSize}
                  handleOgunChange={handleOgunChange}
                  handleRemoveOgun={handleRemoveOgun}
                  handleAddMenuItem={handleAddMenuItem}
                  handleMenuItemChange={handleMenuItemChange}
                  disabled={isFormDisabled}
                  bannedFoods={clientData.bannedFoods}
                  onAddOgun={handleAddOgun}
                />
              </div>

              <div className="space-y-4 mt-6">
                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-primary">
                      Diyetisyen Notu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Danışana özel notunuzu buraya yazabilirsiniz..."
                      className="min-h-[100px]"
                      value={diet.dietitianNote || ""}
                      onChange={(e) =>
                        setDiet({
                          ...diet,
                          dietitianNote: e.target.value,
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex space-x-4 mt-8">
                <DietFormActions
                  onAddOgun={handleAddOgun}
                  onGeneratePDF={generatePDF}
                  dietData={{
                    fullName: getClientFullName(selectedClientId),
                    dietDate: diet.Tarih ? diet.Tarih.toString() : "",
                    weeklyResult: diet.Sonuc,
                    isBirthdayCelebration: diet.isBirthdayCelebration,

                    target: diet.Hedef,
                    id: diet.id,
                    ogunler: diet.Oguns.map((ogun) => ({
                      name: ogun.name,
                      time: ogun.time,
                      notes: ogun.detail,
                      menuItems: ogun.items.filter((item) => {
                        if (typeof item.besin === "string") {
                          return item.besin && item.besin !== "";
                        } else if (
                          typeof item.besin === "object" &&
                          item.besin
                        ) {
                          return (
                            item.besin.name && item.besin.name.trim() !== ""
                          );
                        }
                        return false;
                      }),
                    })),
                  }}
                  diet={diet}
                  clientId={selectedClientId || undefined}
                  onSaveToDatabase={handleSaveToDB}
                  disabled={isFormDisabled}
                  phoneNumber={clientPhoneNumber}
                />
              </div>
            </div>
          </form>
        </Form>
      </div>
      <Toaster />
    </div>
  );
};

export default DietForm;
