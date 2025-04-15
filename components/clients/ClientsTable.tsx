"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchInput } from "@/components/SearchInput";
import {
  Loader2,
  RefreshCcw,
  Eye,
  Edit,
  ClipboardList,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { fetchClients } from "@/services/ClientService";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
}

export const ClientsTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const {
    data: clients = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const handleDeleteClient = (client: { id: number; name: string; surname: string }) => {
    toast({
      title: "Danışanı Sil",
      description: (
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {client.name} {client.surname} isimli danışanı silmek istediğinize emin misiniz?
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Bu işlem geri alınamaz ve danışana ait tüm veriler silinecektir.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  duration: 0,
                });
              }}
              className="bg-gray-50 hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                try {
                  setIsDeleting(client.id);
                  const response = await fetch(`/api/clients/${client.id}`, {
                    method: "DELETE",
                  });

                  if (!response.ok) {
                    throw new Error("Danışan silinirken bir hata oluştu");
                  }

                  toast({
                    title: "Başarılı",
                    description: "Danışan başarıyla silindi.",
                    variant: "default",
                  });

                  refetch();
                } catch (error) {
                  console.error("Error deleting client:", error);
                  toast({
                    title: "Hata",
                    description: "Danışan silinirken bir hata oluştu.",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeleting(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting === client.id}
            >
              {isDeleting === client.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Danışanı Sil"
              )}
            </Button>
          </div>
        </div>
      ),
      variant: "default",
      duration: 10000,
    });
  };

  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${client.name} ${client.surname}`.toLowerCase();
    const phone = client.phoneNumber?.toLowerCase() || "";
    return fullName.includes(searchLower) || phone.includes(searchLower);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-white">Tüm Danışanlar</h2>
            <p className="text-sm text-blue-100 mt-1">
              Toplam {filteredClients.length} danışan
            </p>
          </div>
          <div className="flex gap-2">
            <div className="w-64">
              <SearchInput
                value={searchTerm}
                onChange={(value) => setSearchTerm(value)}
                placeholder="İsim veya telefon ile ara..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60
                  focus:bg-white/20 focus:border-white/30 hover:bg-white/15"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    disabled={isRefetching}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 
                      hover:border-white/30 transition-colors"
                  >
                    <RefreshCcw 
                      className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} 
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Yenile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ad Soyad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefon
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kayıt Tarihi
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {client.name} {client.surname}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{client.phoneNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/clients/${client.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-blue-600 hover:text-blue-900 bg-blue-50 border-blue-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Danışan Detayları</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/diets/new?clientId=${client.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-green-600 hover:text-green-900 bg-green-50 border-green-200"
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Yeni Diyet Oluştur</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/clients/${client.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-amber-600 hover:text-amber-900 bg-amber-50 border-amber-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Danışanı Düzenle</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClient({
                              id: client.id,
                              name: client.name,
                              surname: client.surname
                            })}
                            disabled={isDeleting === client.id}
                            className="h-8 px-2 text-red-600 hover:text-red-900 bg-red-50 border-red-200"
                          >
                            {isDeleting === client.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Danışanı Sil</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
