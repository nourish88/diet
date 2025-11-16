"use client";

import { useState } from "react";
import { DefinitionList } from "@/components/tanimlamalar/DefinitionList";
import { DefinitionForm } from "@/components/tanimlamalar/DefinitionForm";
import DefinitionService, {
  Definition,
  DefinitionType,
} from "@/services/DefinitionService";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet, Activity } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function TanimlamalarPage() {
  const [activeTab, setActiveTab] = useState<DefinitionType>("su_tuketimi");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for data fetching
  const {
    data: suDefinitionsData,
    isLoading: isLoadingSu,
    isError: isErrorSu,
    error: errorSu,
    refetch: refetchSu,
  } = useQuery<Definition[]>({
    queryKey: ['definitions', 'su_tuketimi'],
    queryFn: () => DefinitionService.getDefinitions("su_tuketimi"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: fizikDefinitionsData,
    isLoading: isLoadingFizik,
    isError: isErrorFizik,
    error: errorFizik,
    refetch: refetchFizik,
  } = useQuery<Definition[]>({
    queryKey: ['definitions', 'fiziksel_aktivite'],
    queryFn: () => DefinitionService.getDefinitions("fiziksel_aktivite"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const suDefinitions = suDefinitionsData ?? [];
  const fizikDefinitions = fizikDefinitionsData ?? [];
  const isLoading = isLoadingSu || isLoadingFizik;

  const handleAdd = async (type: DefinitionType, name: string) => {
    try {
      const newDef = await DefinitionService.createDefinition(type, name);

      // Invalidate and refetch the specific definition type
      queryClient.invalidateQueries({ queryKey: ['definitions', type] });
      if (type === "su_tuketimi") {
        refetchSu();
      } else {
        refetchFizik();
      }

      toast({
        title: "Başarılı",
        description: "Tanımlama eklendi",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Tanımlama eklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (
    type: DefinitionType,
    id: number,
    data: { name?: string; isActive?: boolean }
  ) => {
    try {
      await DefinitionService.updateDefinition(id, data);

      // Invalidate and refetch the specific definition type
      queryClient.invalidateQueries({ queryKey: ['definitions', type] });
      if (type === "su_tuketimi") {
        refetchSu();
      } else {
        refetchFizik();
      }

      toast({
        title: "Başarılı",
        description: "Tanımlama güncellendi",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description:
          error.message || "Tanımlama güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: DefinitionType, id: number) => {
    try {
      await DefinitionService.deleteDefinition(id);

      // Invalidate and refetch the specific definition type
      queryClient.invalidateQueries({ queryKey: ['definitions', type] });
      if (type === "su_tuketimi") {
        refetchSu();
      } else {
        refetchFizik();
      }

      toast({
        title: "Başarılı",
        description: "Tanımlama silindi",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Tanımlama silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tanımlamalar</h1>
        <p className="text-gray-600 mt-2">
          Su tüketimi ve fiziksel aktivite tanımlamalarını yönetin
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DefinitionType)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="su_tuketimi" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Su Tüketimi
          </TabsTrigger>
          <TabsTrigger
            value="fiziksel_aktivite"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Fiziksel Aktivite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="su_tuketimi">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Su Tüketimi Tanımlamaları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Tanımlama Ekle
                </label>
                <DefinitionForm
                  type="su_tuketimi"
                  onAdd={(name) => handleAdd("su_tuketimi", name)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mevcut Tanımlamalar
                </label>
                <DefinitionList
                  definitions={suDefinitions}
                  onUpdate={(id, data) => handleUpdate("su_tuketimi", id, data)}
                  onDelete={(id) => handleDelete("su_tuketimi", id)}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiziksel_aktivite">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Fiziksel Aktivite Tanımlamaları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Tanımlama Ekle
                </label>
                <DefinitionForm
                  type="fiziksel_aktivite"
                  onAdd={(name) => handleAdd("fiziksel_aktivite", name)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mevcut Tanımlamalar
                </label>
                <DefinitionList
                  definitions={fizikDefinitions}
                  onUpdate={(id, data) =>
                    handleUpdate("fiziksel_aktivite", id, data)
                  }
                  onDelete={(id) => handleDelete("fiziksel_aktivite", id)}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
