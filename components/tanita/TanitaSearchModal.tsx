"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User } from "lucide-react";

interface TanitaUser {
  id: number;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  bodyType: string | null;
  height: string | null;
  identityNumber: string | null;
  notes: string | null;
}

interface TanitaSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: TanitaUser) => void;
}

export default function TanitaSearchModal({
  open,
  onClose,
  onSelect,
}: TanitaSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search Tanita users
  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery<{ users: TanitaUser[]; count: number }>({
    queryKey: ["tanita-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return { users: [], count: 0 };
      }
      const data = await apiClient.get<{
        success: boolean;
        users: TanitaUser[];
        count: number;
      }>(`/tanita/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      return { users: data.users || [], count: data.count || 0 };
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSelect = (user: TanitaUser) => {
    onSelect(user);
    setSearchQuery("");
    setDebouncedQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tanita'dan Danışan Ara</DialogTitle>
          <DialogDescription>
            İsim, soyisim, telefon veya email ile arama yapabilirsiniz
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              type="text"
              placeholder="Ara... (en az 2 karakter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <span className="ml-2 text-muted-foreground">Aranıyor...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-destructive">
                Arama sırasında bir hata oluştu
              </div>
            )}

            {!isLoading && !error && debouncedQuery.trim().length < 2 && (
              <div className="p-4 text-center text-muted-foreground">
                Arama yapmak için en az 2 karakter girin
              </div>
            )}

            {!isLoading &&
              !error &&
              debouncedQuery.trim().length >= 2 &&
              searchResults &&
              searchResults.users.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  Sonuç bulunamadı
                </div>
              )}

            {!isLoading &&
              !error &&
              searchResults &&
              searchResults.users.length > 0 && (
                <div className="divide-y">
                  {searchResults.users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelect(user)}
                      className="w-full p-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">
                            {user.name} {user.surname}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {user.phone && (
                              <div>📞 {user.phone}</div>
                            )}
                            {user.email && (
                              <div>✉️ {user.email}</div>
                            )}
                            {user.dob && (
                              <div>📅 {user.dob}</div>
                            )}
                            {user.gender && (
                              <div>👤 {user.gender}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(user);
                          }}>
                            Seç
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              İptal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

