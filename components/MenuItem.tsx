"use client";

import React, { useEffect, useState } from "react";
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
import { Button } from "./ui/button";
import { Input } from "./ui/input";

import { Check, ChevronsUpDown, Trash } from "lucide-react";

import { cn } from "@/lib/utils";
import { Item } from "@/types/types";

export const BESINS = [
  { value: "et", label: "Et" },
  { value: "sut", label: "Süt" },
  { value: "yumurta", label: "Yumurta" },
  { value: "ekmek", label: "Ekmek" },
  { value: "peynir", label: "Beyaz Peynir" },
  { value: "yogurt", label: "Yoğurt" },
  { value: "muz", label: "Muz" },
  { value: "elma", label: "Elma" },
  { value: "salatalik", label: "Salatalık" },
  { value: "domates", label: "Domates" },
  { value: "patates", label: "Patates" },
  { value: "pirinc", label: "Pirinç" },
  { value: "makarna", label: "Makarna" },
  { value: "balik", label: "Balık" },
  { value: "tavuk", label: "Tavuk" },
];

export const MIKTARS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" },
];

export const BIRIMS = [
  { value: "adet", label: "Adet" },
  { value: "tatli-kasigi", label: "Tatlı Kaşığı" },
  { value: "yemek-kasigi", label: "Yemek Kaşığı" },
  { value: "su-bardagi", label: "Su Bardağı" },
  { value: "cay-bardagi", label: "Çay Bardağı" },
  { value: "kahve-bardagi", label: "Kahve Bardağı" },
  { value: "gram", label: "Gram" },
  { value: "miligram", label: "Miligram" },
  { value: "mikrogram", label: "Mikrogram" },
  { value: "cay-kasigi", label: "Çay Kaşığı" },
];

interface MenuItemProps {
  item: Item;
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
  const [birim, setBirim] = useState(item.birim || "");
  const [besinOpen, setBesinOpen] = useState(false);
  const [besin, setBesin] = useState(item.besin || "");
  const [customBesinInput, setCustomBesinInput] = useState("");

  useEffect(() => {
    setMiktar(item.miktar || "");
    setBirim(item.birim || "");
    setBesin(item.besin || "");
    // If besin is not in the list, it's a custom entry
    if (item.besin && !BESINS.some((b) => b.label === item.besin)) {
      setCustomBesinInput(item.besin);
    } else {
      setCustomBesinInput("");
    }
  }, [item]);

  const updateParentState = (field: string, value: string) => {
    onItemChange(ogunIndex, index, field, value);
  };

  // Handle custom besin input
  const handleCustomBesinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomBesinInput(value);
    setBesin(value);
    updateParentState("besin", value);
  };

  return (
    <div className="flex flex-wrap gap-2 w-full rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow">
      <div className="w-[20%] min-w-[90px]">
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
      <div className="w-[30%] min-w-[120px]">
        <Popover open={birimOpen} onOpenChange={setBirimOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={birimOpen}
              className="w-full justify-between border-gray-300 shadow-sm hover:bg-gray-50 h-auto min-h-[36px] py-2 px-3"
            >
              <div className="w-full text-left overflow-visible break-words">
                {birim ? birim : "Birim"}
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Birim ara..." />
              <CommandList>
                <CommandEmpty>Birim bulunamadı.</CommandEmpty>
                <CommandGroup>
                  {BIRIMS.map((framework) => (
                    <CommandItem
                      key={framework.value}
                      value={framework.value}
                      onSelect={(currentValue) => {
                        const selectedItem = BIRIMS.find(
                          (b) => b.value === currentValue
                        );
                        if (selectedItem) {
                          setBirim(selectedItem.label);
                          updateParentState("birim", selectedItem.label);
                        } else {
                          setBirim("");
                          updateParentState("birim", "");
                        }
                        setBirimOpen(false);
                      }}
                    >
                      <span className="truncate">{framework.label}</span>
                      <Check
                        className={cn(
                          "ml-auto",
                          birim === framework.label
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex-1 min-w-[100px]">
        <Popover open={besinOpen} onOpenChange={setBesinOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={besinOpen}
              className="w-full justify-between border-gray-300 shadow-sm hover:bg-gray-50 h-auto min-h-[36px] py-2 px-3"
            >
              <div className="w-full text-left overflow-visible break-words whitespace-pre-wrap">
                {besin || "Besin"}
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Besin ara veya ekle..." />
              <div className="px-3 py-2 border-b">
                <Input
                  value={customBesinInput}
                  onChange={handleCustomBesinChange}
                  placeholder="Özel besin girin"
                  className="w-full border-gray-300"
                />
              </div>
              <CommandList>
                <CommandEmpty>Besin bulunamadı.</CommandEmpty>
                <CommandGroup>
                  {BESINS.map((framework) => (
                    <CommandItem
                      key={framework.value}
                      value={framework.value}
                      onSelect={(currentValue) => {
                        const selectedItem = BESINS.find(
                          (b) => b.value === currentValue
                        );
                        if (selectedItem) {
                          setBesin(selectedItem.label);
                          setCustomBesinInput("");
                          updateParentState("besin", selectedItem.label);
                        }
                        setBesinOpen(false);
                      }}
                    >
                      <span className="truncate">{framework.label}</span>
                      <Check
                        className={cn(
                          "ml-auto",
                          besin === framework.label
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={() => onDelete(index)}
          className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors duration-200 flex items-center justify-center"
          aria-label="Sil"
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default MenuItem;
