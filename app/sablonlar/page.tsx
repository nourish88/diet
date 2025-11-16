"use client";

import { useState, useMemo } from "react";
import { TemplateCard } from "@/components/sablonlar/TemplateCard";
import TemplateService, { DietTemplate } from "@/services/TemplateService";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export default function SablonlarPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use React Query for data fetching
  const {
    data: templates = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DietTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      console.log("🔄 SablonlarPage: Loading templates...");
      const data = await TemplateService.getTemplates();
      console.log("📋 SablonlarPage: Templates loaded:", data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use mutation for delete operation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await TemplateService.deleteTemplate(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Başarılı",
        description: "Şablon silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şablon silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleUse = (templateId: number) => {
    // Navigate to diet form with template parameter
    router.push(`/diets/new?templateId=${templateId}`);
  };

  const handleEdit = (template: DietTemplate) => {
    // For now, just show a toast - editing can be added later
    toast({
      title: "Bilgi",
      description: "Şablon düzenleme özelliği yakında eklenecek",
    });
  };

  const handleDelete = async (templateId: number) => {
    deleteMutation.mutate(templateId);
  };

  // Get categories
  const categories = useMemo(
    () => ["all", ...new Set(templates.map((t) => t.category || "Diğer"))],
    [templates]
  );

  const filteredTemplates = useMemo(
    () =>
      selectedCategory === "all"
        ? templates
        : templates.filter((t) => (t.category || "Diğer") === selectedCategory),
    [templates, selectedCategory]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Diyet Şablonları
            </h1>
            <p className="text-gray-600 mt-2">
              Hazır şablonlarla hızlıca diyet oluşturun
            </p>
          </div>
          <Button
            onClick={() => router.push("/diets/new")}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Şablon Oluştur
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          💡 İpucu: Diyet yazarken "📋 Şablon Olarak Kaydet" butonunu kullanın
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="mb-6">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat === "all" ? "Tümü" : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {isError ? (
          <div className="text-center py-16 bg-red-50 rounded-lg border-2 border-red-200">
            <p className="text-red-600 mb-4">
              Şablonlar yüklenirken bir hata oluştu.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Tekrar Dene
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Şablonlar yükleniyor...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Henüz şablon bulunmuyor
            </h3>
            <p className="text-gray-500 mb-6">
              Bir diyet yazıp "Şablon Olarak Kaydet" ile ilk şablonunuzu
              oluşturabilirsiniz
            </p>
            <Button
              onClick={() => router.push("/diets/new")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Diyet Oluştur
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUse}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Tabs>

      <Toaster />
    </div>
  );
}
