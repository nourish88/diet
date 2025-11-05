"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import SuggestionService, {
  BesinSuggestion,
} from "@/services/SuggestionService";
import { Loader2, Star } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Ensure value is always a string (controlled input)
  const inputValue = value || "";

  // Check if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Fetch suggestions when value changes
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
      setShowSuggestions(results.length > 0);
      setIsLoading(false);
      setSelectedIndex(-1);
      
      // Update dropdown position when suggestions appear (with small delay for DOM update)
      if (results.length > 0) {
        setTimeout(() => {
          updateDropdownPosition();
        }, 50);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
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
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
      case "Tab":
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
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
    return (
      <>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Aranıyor...</span>
          </div>
        ) : suggestions.length > 0 ? (
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
          if (suggestions.length > 0) {
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
    </div>
  );
};
