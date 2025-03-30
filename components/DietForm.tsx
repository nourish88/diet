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
import { Diet, Ogun } from "../types/types";
import { OGUN, initialDiet } from "../models/dietModels";

import DietTable from "./DietTable";

import DietFormActions from "./DietFormActions";
import DietFormBasicFields from "./DietFormBasicFields";
import { create } from "zustand";
import { useDietActions } from "../hooks/useDietActions";
import useClientActions from "../hooks/useClientActions";
import { ToastContainer } from "./ui/toast";
import { useToast } from "./ui/use-toast";
import ClientSelector from "./ClientSelector";
import { useFontStore } from "@/store/store";

interface DietFormProps {
  initialClientId?: number;
}

const DietForm = ({ initialClientId }: DietFormProps) => {
  const [diet, setDiet] = useState<Diet>(initialDiet);
  const [clients, setClients] = useState<
    Array<{ id: number; name: string; surname: string }>
  >([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null
  );
  const contextId = "0";

  const { toast, toasts, dismiss } = useToast();
  const {
    saveDiet,
    getClientLatestDiet,
    isLoading: isSaving,
  } = useDietActions(selectedClientId || 0);
  const clientActions = useClientActions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  const { fontSize } = useFontStore();

  // Add state for loading
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const clientsData = await clientActions.getClients();
        console.log("Fetched clients:", clientsData);
        if (clientsData) {
          setClients(clientsData);
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

  useEffect(() => {
    if (selectedClientId) {
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      console.log("Selected client:", selectedClient);

      // Load latest diet for this client
      loadLatestDiet();
    }
  }, [selectedClientId]);

  // Function to load the latest diet for a selected client
  const loadLatestDiet = async () => {
    if (!selectedClientId) return;

    try {
      setIsLoading(true);
      const latestDiet = await getClientLatestDiet();

      if (latestDiet) {
        console.log("Found latest diet:", latestDiet);
        // Convert the database diet format to UI diet format
        const uiDiet = convertDbDietToUiDiet(latestDiet);
        setDiet(uiDiet);
        toast({
          title: "Bilgi",
          description: "Danışanın son diyeti yüklendi.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading latest diet:", error);
      toast({
        title: "Hata",
        description: "Son diyet yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to convert database diet format to UI diet format
  const convertDbDietToUiDiet = (dbDiet: any): Diet => {
    console.log("Converting DB diet to UI format:", dbDiet);

    return {
      Tarih: dbDiet.tarih ? new Date(Number(dbDiet.tarih)).toISOString() : null,
      Sonuc: dbDiet.sonuc || "",
      Hedef: dbDiet.hedef || "",
      Su: dbDiet.su || "",
      Fizik: dbDiet.fizik || "",
      Oguns: dbDiet.oguns?.map((dbOgun: any) => ({
        name: dbOgun.name || "",
        time: dbOgun.time || "",
        detail: dbOgun.detail || "",
        order: dbOgun.order || 0,
        items: dbOgun.items?.map((dbItem: any) => ({
          miktar: dbItem.miktar || "",
          birim: dbItem.birim?.name || "",
          besin: dbItem.besin?.name || "",
        })) || [],
      })) || OGUN,
    };
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  const handleAddOgun = () => {
    const newOgun: Ogun = {
      name: "",
      time: "",
      items: [],
      detail: "",
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
              items: [...ogun.items, { birim: "", miktar: "", besin: "" }],
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
    console.log(
      `Updating menu item: ogun=${ogunIndex}, item=${itemIndex}, ${field}=${value}`
    );

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

      console.log("Updated diet state:", newDiet);
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

    // Validate each öğün
    const invalidOguns = diet.Oguns.filter((ogun) => {
      // Check if name or time is empty
      if (!ogun.name.trim() || !ogun.time.trim()) {
        return true;
      }

      // Check if any menu item has missing fields
      if (ogun.items.length > 0) {
        return ogun.items.some(
          (item) =>
            !item.besin.trim() || !item.miktar.trim() || !item.birim.trim()
        );
      }

      return false;
    });

    if (invalidOguns.length > 0) {
      toast({
        title: "Eksik Bilgi",
        description:
          "Lütfen tüm öğün adlarını, saatlerini ve besin detaylarını doldurun.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await saveDiet(diet);

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

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div style={{ fontSize: `${fontSize}px` }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DietHeader />

            <div className="mb-8">
              <DietFormBasicFields
                form={form}
                diet={diet}
                setDiet={(newDiet) => {
                  // Ensure date is stored as ISO string when updating
                  setDiet({
                    ...newDiet,
                    Tarih: newDiet.Tarih instanceof Date ? newDiet.Tarih.toISOString() : newDiet.Tarih,
                  });
                }}
                clientSelector={
                  <ClientSelector
                    onSelectClient={(clientId) => setSelectedClientId(clientId)}
                    selectedClientId={selectedClientId}
                  />
                }
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
              />
            </div>

            <div className="flex space-x-4 mt-8">
              <DietFormActions
                onAddOgun={handleAddOgun}
                onGeneratePDF={generatePDF}
                dietData={{
                  fullName: getClientFullName(selectedClientId),
                  dietDate: diet.Tarih ? diet.Tarih.toString() : "",
                  weeklyResult: diet.Sonuc,
                  target: diet.Hedef,
                  ogunler: diet.Oguns.map((ogun) => ({
                    name: ogun.name,
                    time: ogun.time,
                    menuItems: ogun.items
                      .filter((item) => item.besin && item.besin.trim() !== "")
                      .map((item) =>
                        `${item.miktar || ""} ${item.birim || ""} ${
                          item.besin || ""
                        }`.trim()
                      ),
                    notes: ogun.detail,
                  })),
                  waterConsumption: diet.Su,
                  physicalActivity: diet.Fizik,
                }}
                diet={diet}
                clientId={selectedClientId || undefined}
                onSaveToDatabase={handleSaveToDB}
              />
            </div>
          </form>
        </Form>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default DietForm;
