"use client";

import React, { useEffect, useState } from "react";
import { MenuItem as MenuItemType } from "@/types/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SmartBesinInput } from "./SmartBesinInput";

import { Check, ChevronsUpDown, Trash } from "lucide-react";

import { cn } from "@/lib/utils";

interface Birim {
  id: number;
  name: string;
}

interface MenuItemProps {
  item: MenuItemType;
  index: number;
  ogunIndex: number;
  onDelete: (index: number) => void;
  onItemChange: (
    ogunIndex: number,
    itemIndex: number,
    field: string,
    value: string
  ) => void;
}

const MenuItem = ({
  item,
  index,
  ogunIndex,
  onDelete,
  onItemChange,
}: MenuItemProps) => {
  const [miktar, setMiktar] = useState(item.miktar || "");
  const [birimOpen, setBirimOpen] = useState(false);
  // Initialize birim with the item's birim value
  const [birim, setBirim] = useState(
    typeof item.birim === "object" ? item.birim?.name : item.birim || ""
  );
  const [birims, setBirims] = useState<Birim[]>([]);
  const [isLoadingBirims, setIsLoadingBirims] = useState(false);
  // Initialize besin with the item's besin value
  const [besin, setBesin] = useState(
    typeof item.besin === "object" ? item.besin?.name : item.besin || ""
  );

  useEffect(() => {
    const fetchBirims = async () => {
      try {
        setIsLoadingBirims(true);
        const response = await fetch("/api/birims");
        if (!response.ok) throw new Error("Failed to fetch birims");
        const data = await response.json();
        setBirims(data);
      } catch (error) {
        console.error("Error fetching birims:", error);
      } finally {
        setIsLoadingBirims(false);
      }
    };

    fetchBirims();
  }, []);

  useEffect(() => {
    const miktarValue = item.miktar || "";
    const birimValue =
      typeof item.birim === "object" ? item.birim?.name : item.birim || "";
    const besinValue =
      typeof item.besin === "object" ? item.besin?.name : item.besin || "";

    setMiktar(miktarValue);
    setBirim(birimValue);
    setBesin(besinValue);
  }, [item, index]);

  const updateParentState = (field: string, value: string) => {
    onItemChange(ogunIndex, index, field, value);
  };

  return (
    <div className="flex flex-col gap-2 w-full rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow">
      {/* First row: Besin with delete button */}
      <div className="flex gap-2 w-full">
        <div className="flex-1">
          <SmartBesinInput
            value={besin}
            onChange={(value, suggestion) => {
              setBesin(value);
              updateParentState("besin", value);

              // If a suggestion was selected, auto-fill miktar and birim
              if (suggestion) {
                if (suggestion.miktar) {
                  setMiktar(suggestion.miktar);
                  updateParentState("miktar", suggestion.miktar);
                }
                if (suggestion.birim) {
                  setBirim(suggestion.birim);
                  updateParentState("birim", suggestion.birim);
                }
              }
            }}
            placeholder="Besin ara..."
            className="border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-[36px]"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDelete(index)}
          className="px-3 hover:bg-red-50 hover:text-red-600"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      {/* Second row: Miktar and Birim */}
      <div className="flex gap-2 w-full">
        <div className="w-1/3">
          <div className="relative">
            <Input
              type="text"
              value={miktar}
              onChange={(e) => {
                const value = e.target.value;
                setMiktar(value);
                updateParentState("miktar", value);
              }}
              placeholder="Miktar"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-[36px]"
            />
          </div>
        </div>
        <div className="w-2/3">
          <Popover open={birimOpen} onOpenChange={setBirimOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={birimOpen}
                className="w-full justify-between border-gray-300 shadow-sm hover:bg-gray-50 h-[36px]"
              >
                {birim || "Birim seçiniz"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Birim ara..." />
                <CommandList>
                  <CommandEmpty>Birim bulunamadı...</CommandEmpty>
                  <CommandGroup>
                    {isLoadingBirims ? (
                      <CommandItem disabled>Yükleniyor...</CommandItem>
                    ) : (
                      birims.map((b) => (
                        <CommandItem
                          key={b.id}
                          value={b.name}
                          onSelect={(currentValue) => {
                            setBirim(currentValue);
                            setBirimOpen(false);
                            updateParentState("birim", currentValue);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              birim === b.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {b.name}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;
