"use client";
import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Besin {
  id: number;
  name: string;
}

interface SelectedBesin {
  besinId: number;
  reason?: string;
}

interface MultiBesinSelectorProps {
  selectedBesins: SelectedBesin[];
  onChange: (besins: SelectedBesin[]) => void;
}

const MultiBesinSelector = ({
  selectedBesins,
  onChange,
}: MultiBesinSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [besins, setBesins] = useState<Besin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Ensure selectedBesins is always a valid array
  const safeSelectedBesins = useMemo(() => {
    try {
      if (!selectedBesins) return [];
      if (!Array.isArray(selectedBesins)) return [];
      return selectedBesins.filter(
        (item) => item && typeof item === "object" && "besinId" in item
      );
    } catch (error) {
      // Avoid using console.error with the error object directly
      console.error(
        "Error processing selectedBesins: " +
          ((error as any).message || "Unknown error")
      );
      return [];
    }
  }, [selectedBesins]);

  useEffect(() => {
    let isMounted = true;

    const fetchBesins = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching besinler...");
        const response = await fetch("/api/besinler");
        console.log("Response received:", response.status);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch besinler: ${response.status} ${response.statusText}`
          );
        }

        let data: any;
        try {
          data = await response.json();
          console.log("Data received:", data ? "Data exists" : "No data");
        } catch (jsonError) {
          // Avoid using console.error with the error object directly
          console.error(
            "Error parsing JSON: " +
              ((jsonError as any).message || "Unknown error")
          );
          throw new Error("Invalid response format");
        }

        if (!isMounted) return;

        // Handle the response data
        if (Array.isArray(data)) {
          console.log(`Setting ${data.length} besins`);
          setBesins(data);
        } else {
          console.warn("Received non-array data:", data);
          setBesins([]);
        }
      } catch (error) {
        // Avoid using console.error with the error object directly
        console.error(
          "Error fetching besinler: " +
            ((error as any).message || "Unknown error")
        );
        if (!isMounted) return;
        setError("Besinler yüklenirken bir hata oluştu");
        // Set empty array to prevent infinite loading
        setBesins([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBesins();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleBesin = (besinId: number) => {
    try {
      const isSelected = safeSelectedBesins.some(
        (b) => b && b.besinId === besinId
      );

      if (isSelected) {
        // Remove the besin
        const newSelection = safeSelectedBesins.filter(
          (b) => b && b.besinId !== besinId
        );
        onChange(newSelection);
      } else {
        // Add the besin
        // Ensure besinId is a number
        const numericBesinId =
          typeof besinId === "string" ? parseInt(besinId, 10) : besinId;
        if (isNaN(numericBesinId)) {
          console.error("Invalid besinId:", besinId);
          return;
        }
        onChange([...safeSelectedBesins, { besinId: numericBesinId }]);
      }
    } catch (error) {
      // Avoid using console.error with the error object directly
      console.error(
        "Error toggling besin: " + ((error as any).message || "Unknown error")
      );
      // Ensure besinId is a number
      const numericBesinId =
        typeof besinId === "string" ? parseInt(besinId, 10) : besinId;
      if (!isNaN(numericBesinId)) {
        onChange([{ besinId: numericBesinId }]);
      } else {
        onChange([]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
        <span>Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center text-red-500 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Hata</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition-colors"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }
  console.log("Besins available:", besins.length);

  if (besins.length === 0) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
        <div className="flex items-center text-yellow-700 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Uyarı</span>
        </div>
        <p className="text-sm text-yellow-600">
          Besin listesi boş. Lütfen önce besin ekleyin.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-600 text-sm rounded hover:bg-yellow-200 transition-colors"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {safeSelectedBesins.length > 0
            ? `${safeSelectedBesins.length} besin seçildi`
            : "Besin seçin..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Besin ara..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>Besin bulunamadı.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {besins
                .filter(
                  (besin) =>
                    searchQuery.trim() === "" ||
                    besin.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((besin) => (
                  <CommandItem
                    key={besin.id}
                    onSelect={() => toggleBesin(besin.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        safeSelectedBesins.some(
                          (b) => b && b.besinId === besin.id
                        )
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {besin.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiBesinSelector;
