"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { ToastContainer } from "./ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface BesinGroup {
  id: number;
  description: string;
}

interface BesinFormProps {
  initialData?: {
    id?: number;
    name: string;
    priority: number;
    groupId: number | null;
  };
  onSuccess?: (besinId: number) => void;
  isEdit?: boolean;
}

const BesinForm = ({
  initialData = {
    name: "",
    priority: 0,
    groupId: null,
  },
  onSuccess,
  isEdit = false,
}: BesinFormProps) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<BesinGroup[]>([]);
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/besin-gruplari");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching besin groups:", error);
      toast({
        title: "Hata",
        description: "Besin grupları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "priority" ? parseInt(value) : value,
    }));
  };

  const handleGroupChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      groupId: value ? parseInt(value) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name) {
        toast({
          title: "Hata",
          description: "Besin adı zorunludur.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const apiUrl =
        isEdit && initialData.id
          ? `/api/besinler/${initialData.id}`
          : "/api/besinler";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Besin kaydedilirken bir hata oluştu");
      }

      const data = await response.json();

      toast({
        title: "Başarılı",
        description: isEdit
          ? "Besin başarıyla güncellendi."
          : "Besin başarıyla eklendi.",
        variant: "default",
      });

      if (onSuccess && data.id) {
        onSuccess(data.id);
      } else if (!isEdit) {
        // Reset form after successful creation
        setFormData({
          name: "",
          priority: 0,
          groupId: null,
        });
      }
    } catch (error) {
      console.error("Error submitting besin form:", error);
      toast({
        title: "Hata",
        description: isEdit
          ? "Besin güncellenirken bir hata oluştu."
          : "Besin eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
        <h2 className="text-lg font-medium">
          {isEdit ? "Besin Düzenle" : "Yeni Besin Ekle"}
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          {isEdit
            ? "Besin bilgilerini güncelleyin"
            : "Yeni besin kaydı oluşturun"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Besin Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Besin adını girin"
            />
          </div>

          {/* Priority field */}
          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Öncelik
            </label>
            <input
              type="number"
              id="priority"
              name="priority"
              min="0"
              value={formData.priority}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Öncelik değeri"
            />
            <p className="text-xs text-gray-500 mt-1">
              Daha yüksek değerler, listede daha üstte gösterilir
            </p>
          </div>

          {/* Group field */}
          <div className="md:col-span-2">
            <label
              htmlFor="groupId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Besin Grubu
            </label>
            <Select
              value={formData.groupId?.toString() || "none"}
              onValueChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  groupId: value !== "none" ? parseInt(value) : null,
                }));
              }}
            >
              <SelectTrigger className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Besin grubu seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Grup seçilmedi</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/besinler")}
            className="border-gray-300"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? "Güncelle" : "Kaydet"}
              </>
            )}
          </Button>
        </div>
      </form>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default BesinForm;
