"use client";

import { useState, useEffect } from "react";
import { TemplateCard } from "@/components/sablonlar/TemplateCard";
import TemplateService, { DietTemplate } from "@/services/TemplateService";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SablonlarPage() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 SablonlarPage: Loading templates...");
      const data = await TemplateService.getTemplates();
      console.log("📋 SablonlarPage: Templates loaded:", data);
      setTemplates(data);
    } catch (error) {
      console.error("❌ SablonlarPage: Error loading templates:", error);
      toast({
        title: "Hata",
        description: "Şablonlar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    try {
      await TemplateService.deleteTemplate(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
      toast({
        title: "Başarılı",
        description: "Şablon silindi",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Şablon silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  // Get categories
  const categories = [
    "all",
    ...new Set(templates.map((t) => t.category || "Diğer")),
  ];

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => (t.category || "Diğer") === selectedCategory);

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

        {isLoading ? (
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
