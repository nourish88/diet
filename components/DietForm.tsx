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
import TemplateService from "@/services/TemplateService";
import { TemplateSelector } from "./sablonlar/TemplateSelector";
import { Button } from "./ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface DietFormProps {
  initialClientId?: number;
  initialTemplateId?: number;
}

const DietForm = ({ initialClientId, initialTemplateId }: DietFormProps) => {
  const supabase = createClient();
  const [diet, setDiet] = useState<Diet>({
    ...initialDiet,
  });
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null
  );
  const [selectedClientName, setSelectedClientName] = useState<string>("");
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

  // Template states
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Separate effect for initial client fetch if initialClientId is provided
  useEffect(() => {
    const fetchInitialClient = async () => {
      if (!initialClientId) return;

      try {
        setIsLoading(true);

        // Get authentication token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`/api/clients/${initialClientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch client");
        }

        if (data.client) {
          setSelectedClientId(data.client.id);
          setSelectedClientName(`${data.client.name} ${data.client.surname}`);

          // Set client data here instead of in a separate effect
          setClientData({
            illness: data.client.illness,
            bannedFoods: data.client.bannedFoods || [],
          });
          const phone = data.client.phoneNumber
            ? "+90" + data.client.phoneNumber
            : undefined;
          setClientPhoneNumber(phone);

          // Load latest diet for this client
          await loadLatestDiet(data.client.id);
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

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const data = await TemplateService.getTemplates();
        setTemplates(data);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  // Load initial template if provided
  useEffect(() => {
    const loadInitialTemplate = async () => {
      if (!initialTemplateId) return;

      try {
        setIsLoading(true);
        const template = await TemplateService.getTemplate(initialTemplateId);

        // Convert template to diet format
        const templateDiet: Diet = {
          id: 0,
          AdSoyad: "",
          Tarih: new Date().toISOString(),
          Su: template.su || "",
          Fizik: template.fizik || "",
          Hedef: template.hedef || "",
          Sonuc: template.sonuc || "",
          dietitianNote: "",
          isBirthdayCelebration: false,
          isImportantDateCelebrated: false,
          importantDateId: null,
          importantDateName: null,
          Oguns: template.oguns.map((ogun) => ({
            name: ogun.name,
            time: ogun.time,
            detail: ogun.detail || "",
            order: ogun.order,
            items: ogun.items.map((item) => ({
              miktar: item.miktar,
              birim: item.birim,
              besin: item.besinName,
            })),
          })),
        };

        setDiet(templateDiet);

        toast({
          title: "Şablon Yüklendi",
          description: `"${template.name}" şablonu kullanılıyor`,
        });
      } catch (error) {
        console.error("Error loading template:", error);
        toast({
          title: "Hata",
          description: "Şablon yüklenirken bir hata oluştu",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialTemplate();
  }, [initialTemplateId]);

  // Add this to your state
  const [clientPhoneNumber, setClientPhoneNumber] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const fetchClientData = async () => {
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

        try {
          // Fetch client details
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (!token) return;

          const response = await fetch(`/api/clients/${selectedClientId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) return;

          const data = await response.json();
          const client = data.client;

          if (!client) return;

          // Set client name for display
          setSelectedClientName(`${client.name} ${client.surname}`);

          // Set client data
          setClientData({
            illness: client.illness,
            bannedFoods: client.bannedFoods || [],
          });

          const phone = client.phoneNumber
            ? "+90" + client.phoneNumber
            : undefined;
          setClientPhoneNumber(phone);

          // Update diet with client name
          setDiet((prev) => ({
            ...prev,
            AdSoyad: `${client.name} ${client.surname}`,
          }));

          // Load latest diet for this client
          loadLatestDiet();
        } catch (error) {
          console.error("Error fetching client data:", error);
        }
      } else {
        console.log("selected client id is null");
        setClientPhoneNumber(undefined);
        setClientData({ illness: null, bannedFoods: [] });
        setSelectedClientName("");
      }
    };

    fetchClientData();
  }, [selectedClientId]);

  // Function to load the latest diet for a selected client
  const loadLatestDiet = async (clientId?: number) => {
    const targetClientId = clientId || selectedClientId;
    if (!targetClientId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/diets/latest/${targetClientId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No previous diet found for client");
          setDiet((prev) => ({
            ...prev,
            Oguns: OGUN,
            Su: "",
            Fizik: "",
            Sonuc: "",
            Hedef: "",
            dietitianNote: "",
          }));
          return;
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data && data.id) {
        // Create the UI diet with correct field mapping from API response
        const uiDiet = {
          ...convertDbDietToUiDiet(data, targetClientId),
          // Use the correct field names from API response
          Su: data.su || "",
          Fizik: data.fizik || "",
          Sonuc: data.sonuc || "",
          Hedef: data.hedef || "",
          dietitianNote: data.dietitianNote || "",
          Tarih:
            data.tarih || data.createdAt || new Date().toISOString(),
        };

        setDiet(uiDiet);
      }
    } catch (error) {
      console.error("Error loading latest diet:", error);
      setDiet((prev) => ({
        ...prev,
        Oguns: OGUN,
        Su: "",
        Fizik: "",
        Sonuc: "",
        Hedef: "",
        dietitianNote: "",
      })); // Add this
      // Initialize with empty diet on error
      setDiet((prev) => ({
        ...prev,
        Oguns: OGUN,
        Su: "",
        Fizik: "",
        Sonuc: "",
        Hedef: "",
        dietitianNote: "",
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
  const convertDbDietToUiDiet = (dbDiet: any, clientId?: number): Diet => {
    try {
      return {
        id: dbDiet.id,
        AdSoyad: getClientFullName(clientId || selectedClientId),
        Tarih: dbDiet.tarih || dbDiet.createdAt || new Date().toISOString(),
        Hedef: dbDiet.hedef || "",
        Sonuc: dbDiet.sonuc || "",
        Su: dbDiet.su || "",
        Fizik: dbDiet.fizik || "",
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
              dbOgun.items?.map((dbItem: any) => {
                const miktarValue = dbItem.miktar || "";
                const birimValue =
                  typeof dbItem.birim === "object" && dbItem.birim
                    ? dbItem.birim.name || ""
                    : dbItem.birim || "";
                const besinValue =
                  typeof dbItem.besin === "object" && dbItem.besin
                    ? dbItem.besin.name || ""
                    : dbItem.besin || "";

                return {
                  miktar: miktarValue,
                  birim: birimValue,
                  besin: besinValue,
                };
              }) || [],
          })) || OGUN,
      };
    } catch (error) {
      console.error("Error converting DB diet to UI diet:", error);
      return {
        id: 0,
        AdSoyad: getClientFullName(selectedClientId),
        Tarih: new Date().toISOString(),
        Hedef: "",
        Sonuc: "",
        Su: "",
        Fizik: "",
        dietitianNote: "",
        isBirthdayCelebration: false,
        isImportantDateCelebrated: false,
        importantDateId: null,
        importantDateName: null,
        Oguns: OGUN,
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
    return selectedClientName || "İsimsiz Danışan";
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
                selectedClientName={selectedClientName}
              />
            </div>

            {/* Template selector button */}
            {!initialTemplateId && (
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateSelector(true)}
                  className="w-full border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  📋 Şablondan Başla
                </Button>
              </div>
            )}

            {/* Template Selector Modal */}
            <TemplateSelector
              open={showTemplateSelector}
              onClose={() => setShowTemplateSelector(false)}
              templates={templates}
              isLoading={isLoadingTemplates}
              onSelect={async (template) => {
                try {
                  // Convert template to diet format
                  const templateDiet: Diet = {
                    id: 0,
                    AdSoyad: getClientFullName(selectedClientId),
                    Tarih: new Date().toISOString(),
                    Su: template.su || "",
                    Fizik: template.fizik || "",
                    Hedef: template.hedef || "",
                    Sonuc: template.sonuc || "",
                    dietitianNote: "",
                    isBirthdayCelebration: false,
                    isImportantDateCelebrated: false,
                    importantDateId: null,
                    importantDateName: null,
                    Oguns: template.oguns.map((ogun) => ({
                      name: ogun.name,
                      time: ogun.time,
                      detail: ogun.detail || "",
                      order: ogun.order,
                      items: ogun.items.map((item) => ({
                        miktar: item.miktar,
                        birim: item.birim,
                        besin: item.besinName,
                      })),
                    })),
                  };

                  setDiet(templateDiet);

                  toast({
                    title: "Şablon Yüklendi",
                    description: `"${template.name}" şablonu kullanılıyor`,
                  });
                } catch (error) {
                  console.error("Error loading template:", error);
                  toast({
                    title: "Hata",
                    description: "Şablon yüklenirken bir hata oluştu",
                    variant: "destructive",
                  });
                }
              }}
            />

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
                  setDiet={(newDietOrUpdater) => {
                    const isDate = (value: any): value is Date =>
                      value &&
                      Object.prototype.toString.call(value) ===
                        "[object Date]" &&
                      !isNaN(value);

                    // Use functional update to get the latest state
                    setDiet((prevDiet) => {
                      const newDiet =
                        typeof newDietOrUpdater === "function"
                          ? newDietOrUpdater(prevDiet) // Use prevDiet instead of diet!
                          : newDietOrUpdater;

                      return {
                        ...newDiet,
                        Tarih: isDate(newDiet.Tarih)
                          ? newDiet.Tarih.toISOString()
                          : newDiet.Tarih,
                      };
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
                  importantDateId={diet.importantDateId}
                  onGeneratePDF={generatePDF}
                  dietData={{
                    fullName: getClientFullName(selectedClientId),
                    dietDate: diet.Tarih ? diet.Tarih.toString() : "",
                    weeklyResult: diet.Sonuc,
                    isBirthdayCelebration: diet.isBirthdayCelebration,
                    isImportantDateCelebrated: diet.isImportantDateCelebrated,
                    target: diet.Hedef,
                    id: diet.id,
                    ogunler: (diet.Oguns || []).map((ogun) => ({
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
