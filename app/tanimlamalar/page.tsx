"use client";

import { useState, useEffect } from "react";
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

export default function TanimlamalarPage() {
  const [suDefinitions, setSuDefinitions] = useState<Definition[]>([]);
  const [fizikDefinitions, setFizikDefinitions] = useState<Definition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DefinitionType>("su_tuketimi");
  const { toast } = useToast();

  useEffect(() => {
    loadDefinitions();
  }, []);

  const loadDefinitions = async () => {
    try {
      setIsLoading(true);
      const [suDefs, fizikDefs] = await Promise.all([
        DefinitionService.getDefinitions("su_tuketimi"),
        DefinitionService.getDefinitions("fiziksel_aktivite"),
      ]);
      setSuDefinitions(suDefs);
      setFizikDefinitions(fizikDefs);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Tanımlamalar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (type: DefinitionType, name: string) => {
    try {
      const newDef = await DefinitionService.createDefinition(type, name);

      if (type === "su_tuketimi") {
        setSuDefinitions([newDef, ...suDefinitions]);
      } else {
        setFizikDefinitions([newDef, ...fizikDefinitions]);
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
      const updated = await DefinitionService.updateDefinition(id, data);

      if (type === "su_tuketimi") {
        setSuDefinitions(
          suDefinitions.map((def) => (def.id === id ? updated : def))
        );
      } else {
        setFizikDefinitions(
          fizikDefinitions.map((def) => (def.id === id ? updated : def))
        );
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

      if (type === "su_tuketimi") {
        setSuDefinitions(suDefinitions.filter((def) => def.id !== id));
      } else {
        setFizikDefinitions(fizikDefinitions.filter((def) => def.id !== id));
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
        baseId="tanimlamalar-tabs"
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
