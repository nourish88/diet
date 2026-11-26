"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "./ui/form";
import DietHeader from "./DietHeader";
import { NotificationTestPanel } from "./NotificationTestPanel";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formSchema } from "../schemas/formSchema";
import { Diet, BannedFood } from "../types/types";
import { createInitialDiet } from "../models/dietModels";
import DietTable from "./DietTable";
import DietFormActions from "./DietFormActions";
import DietFormBasicFields from "./DietFormBasicFields";
import { useDietActions } from "@/hooks/useDietActions";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import ClientSelector from "./ClientSelector";
import { useFontStore } from "@/store/store";
import ClientWarnings from "./ClientWarnings";
import TemplateService, { type DietTemplate } from "@/services/TemplateService";
import { TemplateSelector } from "./sablonlar/TemplateSelector";
import { Button } from "./ui/button";
import { FileText } from "lucide-react";
import { useDietLogging } from "@/hooks/useDietLogging";
import { sortMealsByTime } from "@/lib/diet-utils";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { resolveClientName } from "@/lib/client-name";
import { describeRequestError } from "@/lib/http-request";
import {
  convertDbDietToUiDiet as convertDbDietToUiDietUtil,
  getClientFullName as getClientFullNameUtil,
  convertTemplateToDiet,
  prepareDietDataForPDF,
} from "./diet/utils/dietFormUtils";
import { useDietFormHandlers } from "./diet/hooks/useDietFormHandlers";
import { useDietFormDraft } from "./diet/hooks/useDietFormDraft";
import { DietDraftRestorePrompt } from "./diet/DietDraftRestorePrompt";
import { DietMeasurementFields } from "./diet/DietMeasurementFields";
import { DietProgressIndicator } from "./diet/DietProgressIndicator";
import { ClientCheckInSummary } from "./check-ins/ClientCheckInSummary";

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
  const router = useRouter();
  const [diet, setDiet] = useState<Diet>(createInitialDiet);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null
  );
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const clientNamesRef = useRef(new Map<number, string>());
  const editModeRef = useRef(false);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [clientRetry, setClientRetry] = useState(0);
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

  const handleSelectClient = (clientId: number | null) => {
    if (clientId === selectedClientId) return;
    // Selecting another client starts a new program. Ownership corrections for
    // saved programs are handled explicitly on the program detail page.
    editModeRef.current = false;
    setIsUpdateMode(false);
    setSelectedClientName("");
    setSelectedClientId(clientId);
    if (dietLogging.isReady && clientId) {
      if (selectedClientId) {
        dietLogging.logClientChanged(selectedClientId, clientId);
      } else {
        dietLogging.logClientSelected(clientId);
      }
    }
  };
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
      return getClientFullNameUtil(clientId, clientId ? clientNamesRef.current.get(clientId) ?? "" : "");
    },
    []
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
    async (clientId?: number, signal?: AbortSignal) => {
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
        const data = await apiClient.get<LatestDietResponse>(`/diets/latest/${targetClientId}`, { signal });
        if (signal?.aborted) return;

        if (data && data.id) {
          setDiet(convertDbDietToUiDiet(data, targetClientId));

          // Log diet loaded (for reference/tracking)
          if (dietLogging.isReady) {
            dietLogging.logDietLoaded(data.id);
          }
        }
      } catch (error: any) {
        if (signal?.aborted) return;
        // Handle 404 (no previous diet found)
        if (error?.status === 404 || error?.message?.includes("404")) {
          console.log("No previous diet found for client - starting fresh");
          // Initialize with empty diet when no previous diet exists
          setDiet({ ...createInitialDiet(), AdSoyad: getClientFullName(targetClientId) });
          setIsLoading(false);
          return;
        }
        // Preserve the existing draft on transport errors. An error is not an empty diet.
        setClientLoadError(describeRequestError(error));
        toast({ title: "Diyet yüklenemedi", description: describeRequestError(error), variant: "destructive" });

      } finally {
        if (signal?.aborted) return;
        // Ensure loading is set to false even if there was an early return
        setIsLoading((prev) => {
          if (prev) return false;
          return prev;
        });
      }
    },
    [selectedClientId, convertDbDietToUiDiet, getClientFullName, dietLogging, toast]
  );

  // Resolve identity before loading diet data; cancel responses for a previous selection.
  useEffect(() => {
    if (!selectedClientId) {
      setIsLoading(false);
      setClientLoadError(null);
      setSelectedClientName("");
      setClientPhoneNumber(undefined);
      setClientData({ illness: null, bannedFoods: [] });
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setClientLoadError(null);
    const load = async () => {
      try {
        const client = await apiClient.get<ClientResp>(`/clients/${selectedClientId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (client.id !== selectedClientId) throw new Error("Danışan bilgileri eşleşmedi. Yeniden deneyin.");
        const name = resolveClientName(client);
        if (!name) throw new Error("Danışan adı alınamadı. Yeniden deneyin.");
        clientNamesRef.current.set(client.id, name);
        setSelectedClientName(name);
        setClientData({ illness: client.illness ?? null, bannedFoods: client.bannedFoods ?? [] });
        setClientPhoneNumber(client.phoneNumber ?? undefined);
        setDiet((previous) => ({ ...previous, AdSoyad: name }));
        if (dietLogging.isReady) dietLogging.logClientSelected(client.id);
        if (!editModeRef.current) await loadLatestDiet(client.id, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) setClientLoadError(describeRequestError(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
    // Selection and explicit retry own this request; callbacks read identity by client ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, clientRetry]);

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
    editModeRef.current = true;

    try {
      setIsLoading(true);
      const data = await apiClient.get<any>(`/diets/${dietId}`);

      if (data && data.id) {
        // Set update mode flags
        setIsUpdateMode(true);
        setCurrentDietId(dietId);

        // Get client ID from diet
        const clientId = data.client?.id || selectedClientId;
        if (clientId) {
          const name = resolveClientName(data.client);
          if (name) clientNamesRef.current.set(clientId, name);
          setSelectedClientName(name);
          setSelectedClientId(clientId);
        }

        setDiet(convertDbDietToUiDiet(data, clientId));

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
    if (isLoading || !selectedClientName || clientLoadError) {
      toast({ title: "Danışan bilgileri hazır değil", description: "Bilgilerin yüklenmesini bekleyin veya yüklemeyi yeniden deneyin.", variant: "destructive" });
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
  const isFormDisabled = !selectedClientId || isLoading || !selectedClientName || Boolean(clientLoadError);

  const [measurementWeight, setMeasurementWeight] = useState("");
  const [measurementBodyFat, setMeasurementBodyFat] = useState("");

  const {
    showDraftPrompt,
    setShowDraftPrompt,
    clearDraft,
    restoreDraft,
  } = useDietFormDraft(diet, setDiet, selectedClientId, isUpdateMode, !isFormDisabled);

  // ─── Keyboard shortcuts (Madde 1-A) ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isFormDisabled) handleSaveToDB();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, diet, isUpdateMode, isFormDisabled]);

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
              <DietDraftRestorePrompt
                onRestore={restoreDraft}
                onDismiss={() => {
                  setShowDraftPrompt(false);
                  clearDraft();
                }}
              />
            )}

            {/* Progress indicator (Madde 1-F) */}
            {selectedClientId && <DietProgressIndicator diet={diet} />}

            {/* Client selector with improved styling */}
            <div className="mb-4">
              <ClientSelector
                onSelectClient={handleSelectClient}
                selectedClientId={selectedClientId}
                selectedClientName={selectedClientName}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {isUpdateMode
                  ? `Program #${diet.id} güncelleniyor.`
                  : "Yeni program her kayıtta ayrı saklanır; aynı tarihli mevcut programların üzerine yazılmaz."}
              </p>
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

            {selectedClientId && (
              <ClientCheckInSummary clientId={selectedClientId} />
            )}

            {/* Show a message when no client is selected */}
            {clientLoadError && <div role="alert" className="my-3 rounded-lg border border-destructive/40 p-3">
              <p>{clientLoadError}</p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => setClientRetry((value) => value + 1)}>Danışan bilgilerini yeniden yükle</Button>
            </div>}
            {!selectedClientId && (
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
                  onSelectClient={handleSelectClient}
                  disabled={isFormDisabled}
                />
              </div>

              {/* Measurement entry — only shown when a client is selected */}
              {selectedClientId && (
                <DietMeasurementFields
                  weight={measurementWeight}
                  bodyFat={measurementBodyFat}
                  disabled={isFormDisabled}
                  onWeightChange={setMeasurementWeight}
                  onBodyFatChange={setMeasurementBodyFat}
                />
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
