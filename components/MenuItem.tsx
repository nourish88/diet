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

import { Check, ChevronsUpDown, Trash } from "lucide-react";

import { cn } from "@/lib/utils";

interface Birim {
  id: number;
  name: string;
}

interface Besin {
  id: number;
  name: string;
  besinGroup?: {
    id: number;
    description: string;
    name: string;
  };
}

interface GroupedBesins {
  [key: string]: Besin[];
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
  const [besinOpen, setBesinOpen] = useState(false);
  // Initialize besin with the item's besin value
  const [besin, setBesin] = useState(
    typeof item.besin === "object" ? item.besin?.name : item.besin || ""
  );
  const [customBesinInput, setCustomBesinInput] = useState("");
  const [besins, setBesins] = useState<Besin[]>([]);
  const [groupedBesins, setGroupedBesins] = useState<GroupedBesins>({});
  const [isLoadingBesins, setIsLoadingBesins] = useState(false);

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
    const fetchBesins = async () => {
      try {
        setIsLoadingBesins(true);
        const response = await fetch("/api/besinler");
        if (!response.ok) throw new Error("Failed to fetch besins");
        const data: Besin[] = await response.json();

        const grouped = data.reduce((acc: GroupedBesins, besin: Besin) => {
          const groupName = besin.besinGroup?.name || "Diğer";
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(besin);
          return acc;
        }, {});

        setGroupedBesins(grouped);
        setBesins(data);
      } catch (error) {
        console.error("Error fetching besins:", error);
      } finally {
        setIsLoadingBesins(false);
      }
    };

    fetchBesins();
  }, []);

  useEffect(() => {
    setMiktar(item.miktar || "");
    setBirim(
      typeof item.birim === "object" ? item.birim?.name : item.birim || ""
    );
    setBesin(
      typeof item.besin === "object" ? item.besin?.name : item.besin || ""
    );
  }, [item]);

  const updateParentState = (field: string, value: string) => {
    onItemChange(ogunIndex, index, field, value);
  };

  const handleCustomBesinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomBesinInput(value);
    setBesin(value);
    updateParentState("besin", value);
  };

  return (
    <div className="flex flex-col gap-2 w-full rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow">
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

      <div className="flex gap-2 w-full">
        <div className="flex-1">
          <Popover open={besinOpen} onOpenChange={setBesinOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={besinOpen}
                className="w-full justify-between border-gray-300 shadow-sm hover:bg-gray-50 h-[36px]"
              >
                {besin || "Besin seçiniz"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Besin ara..." />
                <CommandList>
                  <CommandEmpty>
                    <Input
                      type="text"
                      value={customBesinInput}
                      onChange={handleCustomBesinChange}
                      placeholder="Özel besin girin"
                      className="w-full p-2 mb-2"
                    />
                  </CommandEmpty>
                  {Object.entries(groupedBesins)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([groupName, groupBesins]) => (
                      <CommandGroup key={groupName} heading={groupName}>
                        {groupBesins
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((b) => (
                            <CommandItem
                              key={b.id}
                              value={b.name}
                              onSelect={(currentValue) => {
                                setBesin(currentValue);
                                setBesinOpen(false);
                                setCustomBesinInput("");
                                updateParentState("besin", currentValue);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  besin === b.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {b.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
    </div>
  );
};

export default MenuItem;
