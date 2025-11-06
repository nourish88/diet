"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import SuggestionService, {
  BesinSuggestion,
} from "@/services/SuggestionService";
import { Loader2, Star, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface SmartBesinInputProps {
  value: string;
  onChange: (value: string, suggestion?: BesinSuggestion) => void;
  onSelect?: (suggestion: BesinSuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SmartBesinInput = ({
  value,
  onChange,
  onSelect,
  placeholder = "Besin ara...",
  className = "",
  autoFocus = false,
}: SmartBesinInputProps) => {
  const [suggestions, setSuggestions] = useState<BesinSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAddBesinDialog, setShowAddBesinDialog] = useState(false);
  const [besinGroups, setBesinGroups] = useState<Array<{ id: number; name: string; description: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isAddingBesin, setIsAddingBesin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Ensure value is always a string (controlled input)
  const inputValue = value || "";

  // Check if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load besin groups when dialog opens
  useEffect(() => {
    if (showAddBesinDialog) {
      fetchBesinGroups();
    }
  }, [showAddBesinDialog]);

  const fetchBesinGroups = async () => {
    try {
      const response = await fetch("/api/besin-gruplari");
      if (response.ok) {
        const data = await response.json();
        setBesinGroups(data);
      }
    } catch (error) {
      console.error("Error fetching besin groups:", error);
    }
  };

  const handleAddBesin = async () => {
    if (!inputValue.trim()) {
      toast({
        title: "Hata",
        description: "Besin adı gereklidir",
        variant: "destructive",
      });
      return;
    }

    setIsAddingBesin(true);
    try {
      const response = await fetch("/api/besinler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: inputValue.trim(),
          priority: 0,
          groupId: selectedGroupId ? parseInt(selectedGroupId) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Besin eklenirken bir hata oluştu");
      }

      const newBesin = await response.json();

      toast({
        title: "Başarılı",
        description: "Besin başarıyla eklendi",
      });

      // Update the input with the new besin name
      onChange(newBesin.name);
      if (onSelect) {
        onSelect({
          id: newBesin.id,
          name: newBesin.name,
          miktar: "",
          birim: "",
          usageCount: 0,
          isFrequent: false,
          score: 1,
        });
      }

      setShowAddBesinDialog(false);
      setSelectedGroupId("");
      setShowSuggestions(false);
    } catch (error: any) {
      console.error("Error adding besin:", error);
      toast({
        title: "Hata",
        description: error.message || "Besin eklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsAddingBesin(false);
    }
  };

  // Check if mobile on mount and resize
  useEffect(() => {
    if (!mounted) return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mounted]);

  // Calculate dropdown position for mobile
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current && mounted) {
      const rect = inputRef.current.getBoundingClientRect();
      // For fixed position, use getBoundingClientRect directly (viewport coordinates)
      setDropdownPosition({
        top: rect.bottom + 4, // Small gap below input
        left: rect.left,
        width: rect.width,
      });
    }
  }, [mounted]);

  // Fetch suggestions when value changes - reduced debounce for faster updates
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      const results = await SuggestionService.getBesinSuggestions(value);
      setSuggestions(results);
      setIsLoading(false);
      setSelectedIndex(-1);
      
      // Always show dropdown when user is typing (for suggestions or "Besin Ekle" button)
      setShowSuggestions(true);
      
      // Update dropdown position when suggestions appear (with small delay for DOM update)
      setTimeout(() => {
        updateDropdownPosition();
      }, 50);
    };

    // Reduced debounce to 150ms for faster response
    const debounceTimer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounceTimer);
  }, [value, updateDropdownPosition]);

  // Update position on scroll/resize (especially important for mobile)
  useEffect(() => {
    if (!showSuggestions || !mounted) return;

    const updatePosition = () => {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
    };

    // Use capture phase for scroll to catch all scroll events
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    // Also listen to scroll on document for better coverage
    document.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSuggestions, updateDropdownPosition, mounted]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;

      case "Enter":
      case "Tab":
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        } else if (suggestions.length === 0 && value && value.length >= 2) {
          // If no suggestions but user has typed enough, open "Besin Ekle" dialog
          e.preventDefault();
          setShowAddBesinDialog(true);
          setShowSuggestions(false);
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectSuggestion = (suggestion: BesinSuggestion) => {
    onChange(suggestion.name, suggestion);
    if (onSelect) {
      onSelect(suggestion);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const renderSuggestionsContent = () => {
    const hasSuggestions = suggestions.length > 0;
    const shouldShowAddButton = value && value.length >= 2 && !isLoading;

    return (
      <>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Aranıyor...</span>
          </div>
        ) : hasSuggestions ? (
          <>
            {/* Header */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-600">
                💡 Önerilen ({suggestions.length})
              </p>
            </div>

            {/* Suggestions List */}
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                  index === selectedIndex
                    ? "bg-indigo-50 border-l-2 border-indigo-500"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {suggestion.name}
                    </span>
                    {suggestion.isFrequent && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {(suggestion.miktar || suggestion.birim) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {suggestion.miktar} {suggestion.birim}
                    </div>
                  )}
                </div>
                {suggestion.usageCount > 0 && (
                  <div className="text-xs text-gray-400">
                    {suggestion.usageCount}× kullanıldı
                  </div>
                )}
              </div>
            ))}

            {/* Footer hint */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                ↑↓ Seç · ⏎ Enter/Tab Ekle · ESC Kapat
              </p>
            </div>
          </>
        ) : shouldShowAddButton ? (
          <>
            {/* No suggestions - Show add button only */}
            <div className="px-3 py-3">
              <p className="text-xs text-gray-600 mb-2">
                "{inputValue}" için öneri bulunamadı
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowAddBesinDialog(true);
                  setShowSuggestions(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                Yeni Besin Ekle
              </button>
            </div>
          </>
        ) : null}
      </>
    );
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Update position immediately on focus
          setTimeout(() => {
            updateDropdownPosition();
          }, 0);
          // Show dropdown if there are suggestions OR if user has typed enough (for "Besin Ekle" button)
          if (suggestions.length > 0 || (value && value.length >= 2)) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && mounted && (
        <>
          {isMobile && typeof document !== 'undefined' ? (
            // Mobile: Use portal to render outside parent container
            createPortal(
              <div
                ref={suggestionsRef}
                className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${Math.max(8, dropdownPosition.left)}px`,
                  width: `${Math.min(dropdownPosition.width, window.innerWidth - 16)}px`,
                  maxWidth: 'calc(100vw - 16px)',
                }}
              >
                {renderSuggestionsContent()}
              </div>,
              document.body
            )
          ) : (
            // Desktop: Normal absolute positioning
            <div
              ref={suggestionsRef}
              className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
            >
              {renderSuggestionsContent()}
            </div>
          )}
        </>
      )}

      {/* Add Besin Dialog */}
      <Dialog open={showAddBesinDialog} onOpenChange={setShowAddBesinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Besin Ekle</DialogTitle>
            <DialogDescription>
              "{inputValue}" adında yeni bir besin ekleyin. İsteğe bağlı olarak bir besin grubu seçebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Besin Adı
              </label>
              <Input
                value={inputValue}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Besin Grubu (İsteğe Bağlı)
              </label>
              <Select
                value={selectedGroupId || "none"}
                onValueChange={(val) => setSelectedGroupId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Besin grubu seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Grup seçilmedi</SelectItem>
                  {besinGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBesinDialog(false);
                setSelectedGroupId("");
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleAddBesin}
              disabled={isAddingBesin || !inputValue.trim()}
            >
              {isAddingBesin ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
