"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "./ui/form";
import DietHeader from "./DietHeader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { EmojiPickerButton } from "@/components/ui/EmojiPickerButton";
import TemplateService from "@/services/TemplateService";
import { TemplateSelector } from "./sablonlar/TemplateSelector";
import { Button } from "./ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useDietLogging } from "@/hooks/useDietLogging";
import { sortMealsByTime, stripEmojis } from "@/lib/diet-utils";

interface DietFormProps {
  initialClientId?: number;
  initialTemplateId?: number;
}

const DietForm = ({ initialClientId, initialTemplateId }: DietFormProps) => {
  const supabase = createClient();
  const router = useRouter();
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
  const [recentlyMovedOgunIndex, setRecentlyMovedOgunIndex] = useState<
    number | null
  >(null);
  const [isSortingMeals, setIsSortingMeals] = useState(false);

  // Initialize diet logging - use refs to track changes
  const [currentDietId, setCurrentDietId] = useState<number | undefined>(
    diet.id
  );
  const dietLogging = useDietLogging({
    clientId: selectedClientId,
    dietId: currentDietId,
  });

  // Update currentDietId when diet.id changes
  useEffect(() => {
    if (diet.id && diet.id !== currentDietId) {
      setCurrentDietId(diet.id);
    }
  }, [diet.id]);

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

  // Log form opened on mount
  useEffect(() => {
    if (dietLogging.isReady) {
      console.log("🔵 Logging form opened, isReady:", dietLogging.isReady);
      dietLogging.logFormOpened();
    } else {
      console.log("🔵 Logging not ready yet, isReady:", dietLogging.isReady);
    }
  }, [dietLogging.isReady]);

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

        if (data && data.id) {
          const oldClientId = selectedClientId;
          setSelectedClientId(data.id);
          setSelectedClientName(`${data.name} ${data.surname}`);

          // Log client selection
          if (dietLogging.isReady) {
            if (oldClientId && oldClientId !== data.id) {
              dietLogging.logClientChanged(oldClientId, data.id);
            } else {
              dietLogging.logClientSelected(data.id);
            }
          }

          // Set client data here instead of in a separate effect
          setClientData({
            illness: data.illness,
            bannedFoods: data.bannedFoods || [],
          });
          const phone = data.phoneNumber ? "+90" + data.phoneNumber : undefined;
          setClientPhoneNumber(phone);

          // Load latest diet for this client
          await loadLatestDiet(data.id);
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
              besinPriority:
                typeof item.besinPriority === "number"
                  ? item.besinPriority
                  : typeof item.priority === "number"
                  ? item.priority
                  : null,
            })),
          })),
        };

        setDiet({
          ...templateDiet,
          Oguns: sortMealsByTime(templateDiet.Oguns),
        });

        // Log template loaded
        if (dietLogging.isReady) {
          dietLogging.logTemplateLoaded(template.id, template.name);
        }

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
  }, [initialTemplateId, dietLogging.isReady]);

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
          const client = data;

          if (!client || !client.id) return;

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

          // Log client selection
          if (dietLogging.isReady) {
            dietLogging.logClientSelected(client.id);
          }

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
          console.log("No previous diet found for client - starting fresh");
          // Initialize with empty diet when no previous diet exists
          setDiet((prev) => ({
            ...prev,
            id: undefined, // Ensure no ID for new diet
            Oguns: sortMealsByTime(
              OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }))
            ),
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
        // NOTE: We keep the ID for logging/reference, but it will be cleared before saving
        // IMPORTANT: Set date to today - old diet date should not be used for new diet
        const uiDiet = {
          ...convertDbDietToUiDiet(data, targetClientId),
          // Use the correct field names from API response
          Su: data.su || "",
          Fizik: data.fizik || "",
          Sonuc: data.sonuc || "",
          Hedef: data.hedef || "",
          dietitianNote: data.dietitianNote || "",
          Tarih: new Date().toISOString(), // Always use today's date for new diet
        };

        console.log(
          `📋 Loaded latest diet (ID: ${data.id}) for display/reference only`
        );
        setDiet({
          ...uiDiet,
          Oguns: sortMealsByTime(uiDiet.Oguns),
        });

        // Log diet loaded (for reference/tracking)
        if (dietLogging.isReady) {
          dietLogging.logDietLoaded(data.id);
        }
      }
    } catch (error) {
      console.error("Error loading latest diet:", error);
      // Initialize with empty diet on error (no ID, fresh start)
      setDiet((prev) => ({
        ...prev,
        id: undefined, // Ensure no ID for new diet
        Oguns: sortMealsByTime(
          OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }))
        ),
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
      const mappedOguns =
          dbDiet.oguns?.map((dbOgun: any) => ({
            name: dbOgun.name || "",
            time: dbOgun.time || "",
          detail: stripEmojis(dbOgun.detail || ""),
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
                const priorityValue =
                  typeof dbItem.besin === "object" && dbItem.besin
                    ? dbItem.besin.priority ?? null
                    : typeof dbItem.besinPriority === "number"
                    ? dbItem.besinPriority
                    : typeof dbItem.priority === "number"
                    ? dbItem.priority
                    : null;

                return {
                  miktar: miktarValue,
                  birim: birimValue,
                  besin: besinValue,
                  besinPriority: priorityValue,
                };
              }) || [],
        })) || OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }));

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
        Oguns: sortMealsByTime(mappedOguns),
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
        Oguns: sortMealsByTime(
          OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }))
        ),
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
    const ogunIndex = diet.Oguns.length;
    setDiet((prev) => {
      const updatedOguns = [...prev.Oguns, newOgun];
      return {
      ...prev,
        Oguns: sortMealsByTime(updatedOguns),
      };
    });

    // Log ogun added
    if (dietLogging.isReady) {
      dietLogging.logOgunAdded(ogunIndex);
    }
  };

  const handleRemoveOgun = (index: number) => {
    const ogunToRemove = diet.Oguns[index];
    setDiet((prev) => {
      const remaining = prev.Oguns.filter((_, idx) => idx !== index);
      return {
      ...prev,
        Oguns: sortMealsByTime(remaining),
      };
    });

    // Log ogun removed
    if (dietLogging.isReady) {
      dietLogging.logOgunRemoved(index, ogunToRemove?.name);
    }
  };

  const handleOgunChange = (
    index: number,
    field: keyof Ogun,
    value: string
  ) => {
    const sanitizedValue =
      field === "detail" ? stripEmojis(value || "") : value;

    setDiet((prev) => ({
      ...prev,
      Oguns: prev.Oguns.map((ogun, idx) =>
        idx === index ? { ...ogun, [field]: sanitizedValue } : ogun
      ),
    }));

    if (dietLogging.isReady) {
      dietLogging.logOgunUpdated(index, field as string, sanitizedValue);
    }
  };

  const handleMealTimeBlur = (index: number) => {
    const currentOgun = diet.Oguns[index];
    if (!currentOgun || !currentOgun.time) {
      return;
    }

    const mealLabel = currentOgun.name || "Öğün";
    const sorted = sortMealsByTime([...diet.Oguns]);
    const newIndex = sorted.indexOf(currentOgun);

    setIsSortingMeals(true);
    setDiet((prev) => ({
      ...prev,
      Oguns: sorted,
    }));

    if (newIndex !== -1 && newIndex !== index) {
      setRecentlyMovedOgunIndex(newIndex);
      toast({
        title: "Öğün sırası güncellendi",
        description: `${mealLabel} saat bilgisine göre yeniden konumlandı.`,
        duration: 2500,
      });
    } else {
      setRecentlyMovedOgunIndex(null);
    }

    setTimeout(() => setIsSortingMeals(false), 250);
  };

  // Check how menu items are being added
  const handleAddMenuItem = (ogunIndex: number) => {
    const itemIndex = diet.Oguns[ogunIndex]?.items.length || 0;
    setDiet((prev) => ({
      ...prev,
      Oguns: prev.Oguns.map((ogun, idx) =>
        idx === ogunIndex
          ? {
              ...ogun,
              items: [
                ...ogun.items,
                {
                  birim: {} as Birim,
                  miktar: "1", // Default miktar is "1"
                  besin: {} as Besin,
                  besinPriority: null,
                },
              ],
            }
          : ogun
      ),
    }));

    // Log item added
    if (dietLogging.isReady) {
      dietLogging.logItemAdded(ogunIndex, itemIndex);
    }
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

    const previousValue =
      diet.Oguns[ogunIndex]?.items[itemIndex]?.[
        field as keyof (typeof diet.Oguns)[0]["items"][0]
      ];
    setDiet((prev) => {
      const normalizedValue =
        field === "besinPriority"
          ? value === "" || value === null
            ? null
            : Number(value)
          : value;

      const newDiet = {
        ...prev,
        Oguns: prev.Oguns.map((ogun, idx) =>
          idx === ogunIndex
            ? {
                ...ogun,
                items: ogun.items.map((item, itemIdx) =>
                  itemIdx === itemIndex
                    ? field === "besinPriority"
                      ? {
                          ...item,
                          besinPriority: normalizedValue as number | null,
                        }
                      : { ...item, [field]: normalizedValue }
                    : item
                ),
              }
            : ogun
        ),
      };

      return newDiet;
    });

    // Log item updated
    if (dietLogging.isReady) {
      const logValue =
        field === "besinPriority"
          ? value === "" || value === null
            ? ""
            : String(Number(value))
          : value;
      dietLogging.logItemUpdated(ogunIndex, itemIndex, field, logValue);
    }
  };

  useEffect(() => {
    if (recentlyMovedOgunIndex !== null) {
      const timeout = setTimeout(() => {
        setRecentlyMovedOgunIndex(null);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [recentlyMovedOgunIndex]);
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

    // Log PDF generated
    if (dietLogging.isReady) {
      dietLogging.logPdfGenerated();
    }
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
      // Always create a new diet - clear ID to prevent update attempts
      // The loaded diet is for display/reference only, not for editing
      const { id: _oldId, ...dietWithoutId } = diet;

      // Include all diet properties including celebration flags
      const dietToSave = {
        ...dietWithoutId,
        id: undefined, // Explicitly ensure no ID is sent
        Tarih: diet.Tarih ? new Date(diet.Tarih).toISOString() : null,
        clientId: selectedClientId,
        isBirthdayCelebration: diet.isBirthdayCelebration || false,
        isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
        importantDateId: diet.importantDateId || null,
        importantDateName: diet.importantDateName || null,
      };
      console.log("💾 Saving new diet (ID cleared):", {
        ...dietToSave,
        id: undefined,
      });
      const result = await saveDiet(dietToSave);

      if (result) {
        // Extract the new diet ID from the result
        // API returns the created diet object with id
        const newDietId = result.id || result.diet?.id;

        if (!newDietId) {
          console.warn("⚠️ No diet ID returned from save operation:", result);
        }

        // Log diet saved from client-side (server-side also logs, but with source="server")
        if (dietLogging.isReady && newDietId) {
          dietLogging.logDietSaved(newDietId);
        }

        // Update local state with new diet ID if available
        if (newDietId) {
          setDiet((prev) => ({
            ...prev,
            id: newDietId,
          }));

          // Redirect to diet detail page after successful save
          toast({
            title: "Başarılı",
            description:
              "Beslenme programı veritabanına kaydedildi. Yönlendiriliyorsunuz...",
            variant: "default",
          });

          // Small delay to show toast, then redirect
          setTimeout(() => {
            router.push(`/diets/${newDietId}`);
          }, 1000);
        } else {
          toast({
            title: "Başarılı",
            description: "Beslenme programı veritabanına kaydedildi.",
            variant: "default",
          });
        }
      }
    } catch (error: any) {
      console.error("Veritabanına kaydetme hatası:", error);

      // Extract detailed error information
      const errorMessage = error?.message || "Bilinmeyen hata";
      const errorStatus = error?.status;
      const errorDetails = error?.details;
      const errorType = error?.errorType || error?.type || "Unknown";

      // Build descriptive error message for user
      let userErrorMessage = "Veritabanına kaydetme sırasında bir hata oluştu.";

      if (errorStatus) {
        if (errorStatus === 403) {
          userErrorMessage = "Bu işlem için yetkiniz bulunmamaktadır.";
        } else if (errorStatus === 400) {
          userErrorMessage =
            "Gönderilen veriler geçersiz. Lütfen formu kontrol edin.";
        } else if (errorStatus === 500) {
          userErrorMessage = "Sunucu hatası oluştu. Lütfen tekrar deneyin.";
        } else if (errorStatus >= 400) {
          userErrorMessage = `Sunucu hatası (${errorStatus}): ${errorMessage}`;
        }
      } else if (errorMessage && errorMessage !== "Unknown error") {
        // If we have a specific error message, use it
        userErrorMessage = errorMessage;
      }

      // Log diet save failed with detailed error info
      if (dietLogging.isReady) {
        const logError =
          errorMessage + (errorStatus ? ` (Status: ${errorStatus})` : "");
        dietLogging.logDietSaveFailed(logError);
      }

      toast({
        title: "Hata",
        description: userErrorMessage,
        variant: "destructive",
        duration: 5000, // Show longer for important errors
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
    <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
      <div style={{ fontSize: `${fontSize}px` }}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-8"
          >
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
                        besinPriority:
                          typeof item.besinPriority === "number"
                            ? item.besinPriority
                            : typeof item.priority === "number"
                            ? item.priority
                            : null,
                      })),
                    })),
                  };

                  setDiet({
                    ...templateDiet,
                    Oguns: sortMealsByTime(templateDiet.Oguns),
                  });

                  // Log template loaded
                  if (dietLogging.isReady) {
                    dietLogging.logTemplateLoaded(template.id, template.name);
                  }

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

                      // Log field changes
                      if (dietLogging.isReady) {
                        // Check for field changes
                        if (newDiet.Su !== prevDiet.Su) {
                          dietLogging.logFieldChanged(
                            "Su",
                            newDiet.Su,
                            prevDiet.Su
                          );
                        }
                        if (newDiet.Fizik !== prevDiet.Fizik) {
                          dietLogging.logFieldChanged(
                            "Fizik",
                            newDiet.Fizik,
                            prevDiet.Fizik
                          );
                        }
                        if (newDiet.Hedef !== prevDiet.Hedef) {
                          dietLogging.logFieldChanged(
                            "Hedef",
                            newDiet.Hedef,
                            prevDiet.Hedef
                          );
                        }
                        if (newDiet.Sonuc !== prevDiet.Sonuc) {
                          dietLogging.logFieldChanged(
                            "Sonuc",
                            newDiet.Sonuc,
                            prevDiet.Sonuc
                          );
                        }
                        if (newDiet.Tarih !== prevDiet.Tarih) {
                          dietLogging.logFieldChanged(
                            "Tarih",
                            newDiet.Tarih,
                            prevDiet.Tarih
                          );
                        }
                        if (newDiet.dietitianNote !== prevDiet.dietitianNote) {
                          dietLogging.logFieldChanged(
                            "dietitianNote",
                            newDiet.dietitianNote,
                            prevDiet.dietitianNote
                          );
                        }
                      }

                      return {
                        ...newDiet,
                        Tarih: isDate(newDiet.Tarih)
                          ? newDiet.Tarih.toISOString()
                          : newDiet.Tarih,
                      };
                    });
                  }}
                  selectedClientId={selectedClientId}
                  onSelectClient={(clientId) => {
                    const oldClientId = selectedClientId;
                    setSelectedClientId(clientId);
                    // Log client change
                    if (dietLogging.isReady && oldClientId !== clientId) {
                      if (oldClientId) {
                        dietLogging.logClientChanged(oldClientId, clientId);
                      } else {
                        dietLogging.logClientSelected(clientId);
                      }
                    }
                  }}
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
                  isSorting={isSortingMeals}
                  bannedFoods={clientData.bannedFoods}
                  onAddOgun={handleAddOgun}
                  onItemRemoved={(ogunIndex, itemIndex) => {
                    if (dietLogging.isReady) {
                      dietLogging.logItemRemoved(ogunIndex, itemIndex);
                    }
                  }}
                  highlightedIndex={recentlyMovedOgunIndex}
                  onMealTimeBlur={handleMealTimeBlur}
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-8">
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
