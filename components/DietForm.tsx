"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "./ui/form";
import DietHeader from "./DietHeader";
import { NotificationTestPanel } from "./NotificationTestPanel";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formSchema } from "../schemas/formSchema";
import { Diet, Ogun, Birim, Besin, BannedFood } from "../types/types";
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
import TemplateService, { type DietTemplate } from "@/services/TemplateService";
import { TemplateSelector } from "./sablonlar/TemplateSelector";
import { Button } from "./ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useDietLogging } from "@/hooks/useDietLogging";
import { sortMealsByTime, stripEmojis } from "@/lib/diet-utils";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  convertDbDietToUiDiet as convertDbDietToUiDietUtil,
  getClientFullName as getClientFullNameUtil,
  convertTemplateToDiet,
  prepareDietDataForPDF,
  createNewOgun,
} from "./diet/utils/dietFormUtils";
import { useDietFormHandlers } from "./diet/hooks/useDietFormHandlers";
import { useDietFormDraft } from "./diet/hooks/useDietFormDraft";

interface ClientResp {
  id: number;
  name: string;
  surname: string;
  illness?: string | null;
  bannedFoods?: BannedFood[];
  phoneNumber?: string | null;
}

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
    bannedFoods: BannedFood[];
  }>({
    illness: null,
    bannedFoods: [],
  });
  const contextId = "0";

  const { toast } = useToast();
  const { saveDiet } = useDietActions();
  const queryClient = useQueryClient();
  const [recentlyMovedOgunIndex, setRecentlyMovedOgunIndex] = useState<
    number | null
  >(null);
  const [isSortingMeals, setIsSortingMeals] = useState(false);

  // Update mode state - tracks if we're updating an existing diet
  // CRITICAL: This distinguishes between:
  // - Update mode: User clicked "Güncelle" button -> Should UPDATE existing diet
  // - New diet mode: User clicked "Yeni Program Ekle" -> Should CREATE new diet even if loadLatestDiet loaded an existing diet
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [updateDietId, setUpdateDietId] = useState<number | undefined>(
    undefined
  );

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
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
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
  // This must be after loadLatestDiet is defined

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

  // Add this to your state
  const [clientPhoneNumber, setClientPhoneNumber] = useState<
    string | undefined
  >(undefined);

  // Wrapper for getClientFullName utility that has access to component state
  const getClientFullName = useCallback(
    (clientId: number | null) => {
      return getClientFullNameUtil(clientId, selectedClientName);
    },
    [selectedClientName]
  );

  // Wrapper for convertDbDietToUiDiet utility that has access to component state
  const convertDbDietToUiDiet = useCallback(
    (dbDiet: any, clientId?: number): Diet => {
      return convertDbDietToUiDietUtil(
        dbDiet,
        clientId || selectedClientId,
        getClientFullName
      );
    },
    [selectedClientId, getClientFullName]
  );

  // Function to load the latest diet for a selected client
  const loadLatestDiet = useCallback(
    async (clientId?: number) => {
      const targetClientId = clientId || selectedClientId;
      if (!targetClientId) return;

      try {
        setIsLoading(true);
        interface LatestDietResponse {
          id: number;
          su?: string | null;
          fizik?: string | null;
          sonuc?: string | null;
          hedef?: string | null;
          dietitianNote?: string | null;
          createdAt?: string;
          tarih?: string | null;
        }
        const data = await apiClient.get<LatestDietResponse>(`/diets/latest/${targetClientId}`);

        if (data && data.id) {
          // Create the UI diet with correct field mapping from API response
          // NOTE: In new diet mode (loadLatestDiet), we keep the ID for logging/reference but won't update
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
      } catch (error: any) {
        // Handle 404 (no previous diet found)
        if (error?.status === 404 || error?.message?.includes("404")) {
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
          setIsLoading(false);
          return;
        }
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
          setIsLoading(false);
          return;
        }

        toast({
          title: "Hata",
          description:
            "Son diyet yüklenirken bir hata oluştu. Yeni bir diyet oluşturabilirsiniz.",
          variant: "destructive",
        });
        setIsLoading(false);
      } finally {
        // Ensure loading is set to false even if there was an early return
        setIsLoading((prev) => {
          if (prev) return false;
          return prev;
        });
      }
    },
    [selectedClientId, convertDbDietToUiDiet, dietLogging, toast, setDiet]
  );

  // Separate effect for initial client fetch if initialClientId is provided
  useEffect(() => {
    const fetchInitialClient = async () => {
      if (!initialClientId) return;

      try {
        setIsLoading(true);

        // Get authentication token
        const data = await apiClient.get<ClientResp>(`/clients/${initialClientId}`);

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
            illness: data.illness ?? null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]); // Only run when initialClientId changes

  useEffect(() => {
    const fetchClientData = async () => {
      // Skip if this is the initial client fetch (it's handled separately)
      if (initialClientId && selectedClientId === initialClientId) {
        return;
      }

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
          const client = await apiClient.get<ClientResp>(`/clients/${selectedClientId}`);

          if (!client || !client.id) return;

          // Set client name for display
          setSelectedClientName(`${client.name} ${client.surname}`);

          // Set client data
          setClientData({
            illness: client.illness ?? null,
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
          await loadLatestDiet();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]); // Only depend on selectedClientId, not loadLatestDiet

  // Load initial template if provided
  useEffect(() => {
    const loadInitialTemplate = async () => {
      if (!initialTemplateId) return;

      try {
        setIsLoading(true);
        const template = await TemplateService.getTemplate(initialTemplateId);

        // Convert template to diet format using utility
        const templateDiet = convertTemplateToDiet(
          template,
          selectedClientId,
          getClientFullName
        );

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
  }, [initialTemplateId, selectedClientId, getClientFullName, dietLogging, toast]);

  // Function to load a specific diet by ID for editing
  const loadDietById = async (dietId: number) => {
    if (!dietId) return;

    try {
      setIsLoading(true);
      const data = await apiClient.get<any>(`/diets/${dietId}`);

      if (data && data.id) {
        // Set update mode flags
        setIsUpdateMode(true);
        setUpdateDietId(dietId);
        setCurrentDietId(dietId);

        // Get client ID from diet
        const clientId = data.client?.id || selectedClientId;
        if (clientId) {
          setSelectedClientId(clientId);
        }

        // Create the UI diet with correct field mapping from API response
        // Keep the original date when editing
        const uiDiet = {
          ...convertDbDietToUiDiet(data, clientId),
          Su: data.su || "",
          Fizik: data.fizik || "",
          Sonuc: data.sonuc || "",
          Hedef: data.hedef || "",
          dietitianNote: data.dietitianNote || "",
          Tarih: data.tarih || data.createdAt || new Date().toISOString(), // Keep original date
          isBirthdayCelebration: data.isBirthdayCelebration || false,
          isImportantDateCelebrated: data.isImportantDateCelebrated || false,
          importantDateId: data.importantDateId || null,
          importantDateName: data.importantDate?.message || null,
        };

        setDiet(uiDiet);

        // Log diet loaded for editing
        if (dietLogging.isReady) {
          dietLogging.logDietLoaded(dietId);
        }
      }
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes("404")) {
        toast({
          title: "Hata",
          description: "Diyet bulunamadı",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      console.error("Error loading diet by ID:", error);
      toast({
        title: "Hata",
        description: "Diyet yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for updateDietId query parameter on mount (after loadDietById is defined)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use URLSearchParams to get query parameters from window.location
    const searchParams = new URLSearchParams(window.location.search);
    const updateDietIdParam = searchParams.get("updateDietId");
    if (updateDietIdParam) {
      const dietId = parseInt(updateDietIdParam);
      if (!isNaN(dietId)) {
        // Load diet for editing - don't call loadLatestDiet in this case
        loadDietById(dietId);
        // Don't continue with normal initialization
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  // Use custom hook for form handlers
  const {
    handleAddOgun,
    handleRemoveOgun,
    handleOgunChange,
    handleMealTimeBlur,
    handleAddMenuItem,
    handleMenuItemChange,
  } = useDietFormHandlers({
    diet,
    setDiet,
    selectedClientId,
    clientData,
    setIsSortingMeals,
    setRecentlyMovedOgunIndex,
    dietLogging,
    toast,
  });

  useEffect(() => {
    if (recentlyMovedOgunIndex !== null) {
      const timeout = setTimeout(() => {
        setRecentlyMovedOgunIndex(null);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [recentlyMovedOgunIndex]);

  const handleSaveToDB = async (
    options: { skipRedirect?: boolean } = {}
  ): Promise<{ ok: boolean; dietId?: number; clientId?: number }> => {
    if (!selectedClientId) {
      toast({
        title: "Hata",
        description: "Lütfen önce bir müşteri seçin",
        variant: "destructive",
      });
      return { ok: false };
    }
    const skipRedirect = options.skipRedirect === true;

    try {
      // CRITICAL: If in update mode, keep the ID to update existing diet
      // Otherwise, clear ID to create a new diet (even if loadLatestDiet loaded an existing one)
      const dietToSave: Diet =
        isUpdateMode && diet.id
          ? {
              ...diet,
              Tarih: diet.Tarih ? new Date(diet.Tarih).toISOString() : null,
              clientId: selectedClientId,
              isBirthdayCelebration: diet.isBirthdayCelebration || false,
              isImportantDateCelebrated:
                diet.isImportantDateCelebrated || false,
              importantDateId: diet.importantDateId || null,
              importantDateName: diet.importantDateName || null,
            }
          : {
              ...diet,
              id: undefined, // Explicitly ensure no ID is sent for new diet
              Tarih: diet.Tarih ? new Date(diet.Tarih).toISOString() : null,
              clientId: selectedClientId,
              isBirthdayCelebration: diet.isBirthdayCelebration || false,
              isImportantDateCelebrated:
                diet.isImportantDateCelebrated || false,
              importantDateId: diet.importantDateId || null,
              importantDateName: diet.importantDateName || null,
            };

      console.log(`💾 ${isUpdateMode ? "Updating" : "Saving new"} diet:`, {
        ...dietToSave,
        id: isUpdateMode ? dietToSave.id : undefined,
        isUpdateMode,
      });
      const result = await saveDiet(dietToSave, isUpdateMode);

      if (result) {
        // Extract the diet ID from the result
        // API returns the created/updated diet object with id
        const dietId = result.id || result.diet?.id || dietToSave.id;

        if (!dietId) {
          console.warn("⚠️ No diet ID returned from save operation:", result);
        }

        // Log diet saved/updated from client-side (server-side also logs, but with source="server")
        // Note: Server-side logging distinguishes between create and update, client-side uses same action
        if (dietLogging.isReady && dietId) {
          dietLogging.logDietSaved(dietId);
        }

        // Update local state with diet ID if available.
        // Also propagate ogun IDs from the API response so downstream
        // features (e.g. manual meal-reminder test push) can reference them
        // without forcing a page reload.
        if (dietId) {
          const savedOguns: Array<{ id?: number; name?: string; time?: string }> =
            Array.isArray(result?.oguns) ? result.oguns : [];
          setDiet((prev) => {
            const next = { ...prev, id: dietId };
            if (savedOguns.length > 0 && Array.isArray(prev.Oguns)) {
              next.Oguns = prev.Oguns.map((ogun) => {
                if (ogun.id) return ogun;
                const match = savedOguns.find(
                  (s) =>
                    s.name === ogun.name &&
                    s.time === ogun.time
                );
                return match?.id ? { ...ogun, id: match.id } : ogun;
              });
            }
            return next;
          });

          // Save measurement if entered
          if (selectedClientId && (measurementWeight || measurementBodyFat)) {
            const measureDate = diet.Tarih
              ? new Date(diet.Tarih).toISOString()
              : new Date().toISOString();
            apiClient
              .post(`/clients/${selectedClientId}/progress`, {
                date: measureDate,
                weight: measurementWeight ? parseFloat(measurementWeight) : undefined,
                bodyFat: measurementBodyFat ? parseFloat(measurementBodyFat) : undefined,
              })
              .then(() => {
                setMeasurementWeight("");
                setMeasurementBodyFat("");
              })
              .catch((err) => console.warn("Ölçüm kaydedilemedi:", err));
          }

          // Show success message
          toast({
            title: "Başarılı",
            description: isUpdateMode
              ? "Beslenme programı güncellendi."
              : "Beslenme programı veritabanına kaydedildi. Yönlendiriliyorsunuz...",
            variant: "default",
          });

          // Invalidate React Query cache
          if (dietId) {
            // Always invalidate specific diet and diets list
            queryClient.invalidateQueries({ queryKey: ["diet", dietId] });
            queryClient.invalidateQueries({ queryKey: ["diets"] });
            // Also refresh dashboard stats if used
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }

          // Clear auto-saved draft on successful save
          clearDraft();

          // Redirect to diet detail page after successful save (only for new
          // diets, and only when the caller didn't ask us to stay put —
          // e.g. "Kaydet ve PDF İndir" wants to remain on the form so the
          // PDF download is not interrupted by navigation).
          if (!isUpdateMode && !skipRedirect) {
            // Small delay to show toast, then redirect
            setTimeout(() => {
              router.push(`/diets/${dietId}`);
            }, 1000);
          }
        } else {
          toast({
            title: "Başarılı",
            description: isUpdateMode
              ? "Beslenme programı güncellendi."
              : "Beslenme programı veritabanına kaydedildi.",
            variant: "default",
          });
        }
        return { ok: true, dietId, clientId: selectedClientId };
      }
      return { ok: false };
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
      return { ok: false };
    }
  };


  // Add this helper function to check if form should be disabled
  const isFormDisabled = !selectedClientId;

  const [measurementWeight, setMeasurementWeight] = useState("");
  const [measurementBodyFat, setMeasurementBodyFat] = useState("");

  const {
    showDraftPrompt,
    setShowDraftPrompt,
    clearDraft,
    restoreDraft,
  } = useDietFormDraft(diet, setDiet, selectedClientId, isUpdateMode);

  // ─── Keyboard shortcuts (Madde 1-A) ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedClientId) handleSaveToDB();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, diet, isUpdateMode]);

  // ─── Progress indicator (Madde 1-F) ───
  const filledMeals = diet.Oguns.filter((o) =>
    o.items.some((item) => {
      const besin = typeof item.besin === "string" ? item.besin : (item.besin as any)?.name;
      return besin && besin.trim();
    })
  ).length;
  const totalMeals = diet.Oguns.length;
  const progressPercent = totalMeals > 0 ? Math.round((filledMeals / totalMeals) * 100) : 0;

  return (
    <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
      <div style={{ fontSize: `${fontSize}px` }}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-8"
          >
            <DietHeader />

            {/* Draft restore prompt (Madde 1-G) */}
            {showDraftPrompt && (
              <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm no-print">
                <span className="text-foreground flex-1">
                  Kaydedilmemiş bir diyet taslağı var. Kaldığın yerden devam et mi?
                </span>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="px-3 py-1 bg-warning text-warning-foreground rounded hover:opacity-90 text-xs font-medium transition-opacity"
                >
                  Devam Et
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDraftPrompt(false); clearDraft(); }}
                  className="px-3 py-1 bg-muted text-foreground rounded hover:bg-accent text-xs transition-colors"
                >
                  Yoksay
                </button>
              </div>
            )}

            {/* Progress indicator (Madde 1-F) */}
            {selectedClientId && totalMeals > 0 && (
              <div className="no-print space-y-1">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    Dolu öğün: <span className="font-semibold text-foreground">{filledMeals}/{totalMeals}</span>
                  </span>
                  <span className={progressPercent === 100 ? "text-success font-semibold" : ""}>
                    {progressPercent}%
                    {progressPercent === 100 && " ✓ Tüm öğünler dolu"}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? "#16a34a" : progressPercent > 50 ? "#3b82f6" : "#f59e0b",
                    }}
                  />
                </div>
              </div>
            )}

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
                  className="w-full border-2 border-dashed border-brand/40 text-brand hover:bg-brand-soft hover:border-brand transition-colors"
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
                  // Convert template to diet format using utility
                  const templateDiet = convertTemplateToDiet(
                    template,
                    selectedClientId,
                    getClientFullName
                  );

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
              <div className="text-center p-4 bg-warning/10 border border-warning/30 rounded-md mb-4">
                <p className="text-foreground">
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

              {/* Measurement entry — only shown when a client is selected */}
              {selectedClientId && (
                <div className="mb-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    Bu tarihe ölçüm ekle (isteğe bağlı)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Kilo (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="ör. 72.5"
                        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={measurementWeight}
                        onChange={(e) => setMeasurementWeight(e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Yağ (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="ör. 24.3"
                        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={measurementBodyFat}
                        onChange={(e) => setMeasurementBodyFat(e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 self-center">Diyet kaydedilirken otomatik olarak da kaydedilir.</p>
                  </div>
                </div>
              )}

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
                  clientId={selectedClientId ?? undefined}
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
                  dietData={prepareDietDataForPDF(
                    diet,
                    getClientFullName(selectedClientId),
                    diet.Tarih || new Date()
                  )}
                  diet={diet}
                  clientId={selectedClientId || undefined}
                  onSaveToDatabase={handleSaveToDB}
                  disabled={isFormDisabled}
                  phoneNumber={clientPhoneNumber}
                  isUpdateMode={isUpdateMode}
                />
              </div>

              {/*
                Manual notification test panel — lets the dietitian verify
                with the client (in-room) that "diet created" and meal
                reminder pushes actually land on their device. Disabled
                until the diet has a real id so the API has something to
                attach the notification to.
              */}
              <div className="mt-6 no-print">
                <NotificationTestPanel
                  dietId={diet.id ?? null}
                  variant="compact"
                  oguns={(diet.Oguns ?? [])
                    .filter((o) => typeof o.id === "number" && o.id > 0)
                    .map((o) => ({
                      id: o.id as number,
                      name: o.name,
                      time: o.time || null,
                    }))}
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
