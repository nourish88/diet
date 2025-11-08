"use client";
import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DropResult,
} from "@hello-pangea/dnd";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Diet, Ogun, MenuItem as MenuItemType } from "@/types/types";
import MenuItemComponent from "@/components/MenuItem";
import { Button } from "@/components/ui/button";
import "react-resizable/css/styles.css";
import { Resizable } from "react-resizable";
import {
  ArrowDownUp,
  Clock,
  Coffee,
  FileText,
  Menu,
  Plus,
  Trash,
} from "lucide-react";
import { OgunQuickActions } from "@/components/OgunQuickActions";
import { MealPreset } from "@/services/PresetService";
import { SmartBesinInput } from "@/components/SmartBesinInput";
import { useToast } from "@/components/ui/use-toast";

interface DietTableProps {
  setDiet: (diet: Diet | ((prevDiet: Diet) => Diet)) => void;
  diet: Diet;
  contextId: string;
  fontSize: number;
  handleOgunChange: (index: number, field: keyof Ogun, value: string) => void;
  handleRemoveOgun: (index: number) => void;
  handleAddMenuItem: (ogunIndex: number) => void;
  handleMenuItemChange: (
    ogunIndex: number,
    itemIndex: number,
    field: string,
    value: string
  ) => void;
  disabled?: boolean;
  bannedFoods?: Array<{ besin: { id: number; name: string } }>;
  onAddOgun: () => void;
  onItemRemoved?: (ogunIndex: number, itemIndex: number) => void;
  highlightedIndex?: number | null;
  onMealTimeBlur?: (ogunIndex: number) => void;
  isSorting?: boolean;
}

const DietTable = ({
  setDiet,
  diet,
  contextId,
  fontSize,
  handleOgunChange,
  handleRemoveOgun,
  handleAddMenuItem,
  handleMenuItemChange,
  disabled = false,
  bannedFoods = [],
  onAddOgun,
  onItemRemoved,
  highlightedIndex = null,
  onMealTimeBlur,
  isSorting = false,
}: DietTableProps) => {
  const effectiveDisabled = disabled || isSorting;

  const [windowWidth, setWindowWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState({
    ogun: 18,
    saat: 10,
    menu: 42,
    aciklama: 30,
  });
  const [isBrowser, setIsBrowser] = useState(false);
  const { toast } = useToast();

  const isFoodBanned = (besinId: number) => {
    return (
      Array.isArray(bannedFoods) &&
      bannedFoods.some((banned) => banned.besin && banned.besin.id === besinId)
    );
  };

  useEffect(() => {
    setIsBrowser(true);
    setWindowWidth(window.innerWidth);

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDeleteMenuItem = (ogunIndex: number, itemIndex: number) => {
    setDiet((prevDiet: Diet): Diet => {
      const updatedOguns = prevDiet.Oguns.map((ogun, idx) =>
        idx === ogunIndex
          ? {
              ...ogun,
              items: ogun.items.filter((_, i) => i !== itemIndex),
            }
          : ogun
      );

      return {
        ...prevDiet,
        Oguns: updatedOguns,
      };
    });

    // Log item removed
    if (onItemRemoved) {
      onItemRemoved(ogunIndex, itemIndex);
    }
  };

  const reorder = (list: Ogun[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result: DropResult) => {
    if (
      !result.destination ||
      result.destination.index === result.source.index
    ) {
      return;
    }

    const reorderedOguns = reorder(
      diet.Oguns,
      result.source.index,
      result.destination.index
    );

    setDiet({
      ...diet,
      Oguns: reorderedOguns,
    });
  };

  // Apply preset to a specific ogun
  const handleApplyPreset = (ogunIndex: number, preset: MealPreset) => {
    setDiet((prevDiet: Diet): Diet => {
      const updatedOguns = prevDiet.Oguns.map((ogun, idx) => {
        if (idx === ogunIndex) {
          return {
            ...ogun,
            items: preset.items.map((item) => ({
              miktar: item.miktar,
              birim: item.birim,
              besin: item.besinName,
            })),
          };
        }
        return ogun;
      });

      return {
        ...prevDiet,
        Oguns: updatedOguns,
      };
    });
  };

  const onResize =
    (column: keyof typeof columnWidths) =>
    (e: any, { size }: { size: { width: number } }) => {
      if (typeof window !== "undefined") {
        const percentWidth = (size.width / window.innerWidth) * 100;
        setColumnWidths((prev) => ({
          ...prev,
          [column]: percentWidth,
        }));
      }
    };

  const getColumnWidth = (columnKey: keyof typeof columnWidths) => {
    if (isBrowser && typeof window !== "undefined") {
      return (columnWidths[columnKey] * window.innerWidth) / 100;
    }
    return 100;
  };

  const renderBirimValue = (item: any) => {
    if (typeof item.birim === "object" && item.birim && item.birim.name) {
      return item.birim.name;
    }
    return item.birim || "";
  };

  const renderBesinValue = (item: any) => {
    if (typeof item.besin === "object" && item.besin && item.besin.name) {
      return item.besin.name;
    }
    return item.besin || "";
  };

  const getItemPriority = (item: MenuItemType) => {
    if (
      typeof item.besinPriority === "number" &&
      !Number.isNaN(item.besinPriority)
    ) {
      return item.besinPriority;
    }
    if (
      typeof item.besin === "object" &&
      item.besin &&
      typeof (item.besin as any).priority === "number"
    ) {
      return (item.besin as any).priority ?? Number.POSITIVE_INFINITY;
    }
    return Number.POSITIVE_INFINITY;
  };

  const getItemName = (item: MenuItemType) => {
    if (typeof item.besin === "string") {
      return item.besin || "";
    }
    if (
      typeof item.besin === "object" &&
      item.besin &&
      typeof item.besin.name === "string"
    ) {
      return item.besin.name;
    }
    return "";
  };

  const handleSortMenuItems = (ogunIndex: number) => {
    const ogunName = diet.Oguns[ogunIndex]?.name || "Öğün";

    setDiet((prevDiet: Diet): Diet => {
      const updatedOguns = prevDiet.Oguns.map((ogun, idx) => {
        if (idx !== ogunIndex) {
          return ogun;
        }

        const sortedItems = ogun.items
          .map((item, originalIndex) => ({ item, originalIndex }))
          .sort((a, b) => {
            const priorityDiff =
              getItemPriority(a.item) - getItemPriority(b.item);
            if (priorityDiff !== 0) {
              return priorityDiff;
            }
            const nameDiff = getItemName(a.item).localeCompare(
              getItemName(b.item),
              "tr",
              { sensitivity: "base" }
            );
            if (nameDiff !== 0) {
              return nameDiff;
            }
            return a.originalIndex - b.originalIndex;
          })
          .map(({ item }) => item);

        return {
          ...ogun,
          items: sortedItems,
        };
      });

      return {
        ...prevDiet,
        Oguns: updatedOguns,
      };
    });

    toast({
      title: "Önceliğe göre sıralandı",
      description: `${ogunName} içerisindeki besinler öncelik değerine göre düzenlendi.`,
    });
  };

  // Check if mobile view (less than 768px)
  const isMobile = windowWidth > 0 && windowWidth < 768;

  const containerClass = effectiveDisabled
    ? "opacity-60 pointer-events-none transition-opacity duration-150"
    : "";

  return (
    <div className={containerClass}>
      {isMobile && isBrowser ? (
        // Mobile view: Card-based layout
        <div className="space-y-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={contextId} direction="vertical">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {diet.Oguns.map((ogun, index) => (
                    <Draggable
                      key={index.toString()}
                      draggableId={index.toString()}
                      index={index}
                    >
                      {(provided: DraggableProvided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white border-2 border-purple-700 rounded-lg shadow-md p-4 space-y-3 transition-all duration-300 ${
                            highlightedIndex === index
                              ? "ring-2 ring-indigo-400 animate-bounce"
                              : ""
                          }`}
                        >
                          {/* Ogun Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <Coffee className="w-5 h-5 text-purple-600" />
                              <Input
                                value={ogun.name}
                                onChange={(e) =>
                                  handleOgunChange(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="font-semibold text-lg border-none shadow-none p-0 h-auto"
                                placeholder="Öğün adı"
                                disabled={disabled}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <Input
                                value={ogun.time}
                                onChange={(e) =>
                                  handleOgunChange(
                                    index,
                                    "time",
                                    e.target.value
                                  )
                                }
                                onBlur={() => onMealTimeBlur?.(index)}
                                className="w-20 text-sm border-gray-300"
                                placeholder="Saat"
                                disabled={effectiveDisabled}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSortMenuItems(index)}
                                disabled={
                                  effectiveDisabled || ogun.items.length < 2
                                }
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              >
                                <ArrowDownUp className="w-4 h-4 mr-1" />
                                Öncelik
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOgun(index)}
                                disabled={effectiveDisabled}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="space-y-2">
                            {ogun.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="flex flex-col gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                              >
                                <div className="flex flex-col gap-2">
                                  <Input
                                    value={item.miktar || ""}
                                    onChange={(e) =>
                                      handleMenuItemChange(
                                        index,
                                        itemIndex,
                                        "miktar",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Miktar"
                                    className="w-full text-sm"
                                  disabled={effectiveDisabled}
                                  />
                                  <Input
                                    value={
                                      typeof item.birim === "object" &&
                                      item.birim
                                        ? item.birim.name || ""
                                        : typeof item.birim === "string"
                                        ? item.birim
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handleMenuItemChange(
                                        index,
                                        itemIndex,
                                        "birim",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Birim (örn: Yemek Kaşığı)"
                                    className="w-full text-sm"
                                  disabled={effectiveDisabled}
                                  />
                                </div>
                                <SmartBesinInput
                                  value={
                                    typeof item.besin === "object" && item.besin
                                      ? item.besin.name || ""
                                      : typeof item.besin === "string"
                                      ? item.besin
                                      : ""
                                  }
                                  onChange={(value, suggestion) => {
                                    handleMenuItemChange(
                                      index,
                                      itemIndex,
                                      "besin",
                                      value
                                    );

                                    // Auto-fill miktar and birim if suggestion selected
                                    if (suggestion) {
                                      if (suggestion.miktar) {
                                        handleMenuItemChange(
                                          index,
                                          itemIndex,
                                          "miktar",
                                          suggestion.miktar
                                        );
                                      }
                                      if (suggestion.birim) {
                                        handleMenuItemChange(
                                          index,
                                          itemIndex,
                                          "birim",
                                          suggestion.birim
                                        );
                                      }
                                    }
                                  }}
                                  placeholder="Besin ara..."
                                  className="text-sm border-gray-300"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteMenuItem(index, itemIndex)
                                  }
                                  disabled={effectiveDisabled}
                                  className="self-start text-red-600 hover:text-red-700 text-xs"
                                >
                                  <Trash className="w-3 h-3 mr-1" />
                                  Sil
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddMenuItem(index)}
                              disabled={effectiveDisabled}
                              className="w-full border-dashed"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Besin Ekle
                            </Button>
                          </div>

                          {/* Detail/Notes */}
                          <Textarea
                            value={ogun.detail || ""}
                            onChange={(e) =>
                              handleOgunChange(
                                index,
                                "detail",
                                e.target.value
                              )
                            }
                            placeholder="Açıklama/Not..."
                            className="text-sm border-gray-300"
                            rows={2}
                            disabled={effectiveDisabled}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Add Ogun Button for Mobile */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddOgun}
                    disabled={effectiveDisabled}
                    className="w-full border-2 border-dashed border-purple-700 text-purple-700 hover:bg-purple-50 mt-4"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Öğün Ekle
                  </Button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      ) : (
        // Desktop view: Table layout
        <div className="overflow-x-auto border-2 border-purple-700 rounded-lg">
          {isBrowser ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={contextId} direction="vertical">
                {(provided: DroppableProvided) => (
                  <table
                    className="min-w-full table-fixed rounded-lg overflow-hidden shadow-md"
                    style={{
                      boxShadow:
                        "0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white h-16 shadow-md border-b-2 border-gray-300">
                        <Resizable
                          width={getColumnWidth("ogun")}
                          height={40}
                          onResize={onResize("ogun")}
                          draggableOpts={{ enableUserSelectHack: false }}
                        >
                          <th
                            style={{ width: `${columnWidths.ogun}%` }}
                            className="px-4 font-semibold text-base tracking-wide relative group border-r border-gray-300/30"
                          >
                            <span className="flex items-center justify-center">
                              <Coffee className="w-5 h-5 mr-2 opacity-80" />
                              <span className="font-semibold">Öğün</span>
                            </span>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/70 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                          </th>
                        </Resizable>
                        <Resizable
                          width={getColumnWidth("saat")}
                          height={40}
                          onResize={onResize("saat")}
                          draggableOpts={{ enableUserSelectHack: false }}
                        >
                          <th
                            style={{ width: `${columnWidths.saat}%` }}
                            className="px-4 font-semibold text-base tracking-wide relative group border-r border-gray-300/30"
                          >
                            <span className="flex items-center justify-center">
                              <Clock className="w-5 h-5 mr-2 opacity-80" />
                              <span className="font-semibold">Zaman</span>
                            </span>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/70 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                          </th>
                        </Resizable>
                        <Resizable
                          width={getColumnWidth("menu")}
                          height={40}
                          onResize={onResize("menu")}
                          draggableOpts={{ enableUserSelectHack: false }}
                        >
                          <th
                            style={{ width: `${columnWidths.menu}%` }}
                            className="px-4 font-semibold text-base tracking-wide relative group border-r border-gray-300/30"
                          >
                            <span className="flex items-center justify-center">
                              <Menu className="w-5 h-5 mr-2 opacity-80" />
                              <span className="font-semibold">Menü</span>
                            </span>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/70 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                          </th>
                        </Resizable>
                        <Resizable
                          width={getColumnWidth("aciklama")}
                          height={40}
                          onResize={onResize("aciklama")}
                          draggableOpts={{ enableUserSelectHack: false }}
                        >
                          <th
                            style={{ width: `${columnWidths.aciklama}%` }}
                            className="px-4 font-semibold text-base tracking-wide relative group border-r border-gray-300/30"
                          >
                            <span className="flex items-center justify-center">
                              <FileText className="w-5 h-5 mr-2 opacity-80" />
                              <span className="font-semibold">Açıklama</span>
                            </span>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/70 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                          </th>
                        </Resizable>
                        <th className="px-4 font-semibold text-base tracking-wide no-print relative group">
                          <span className="flex items-center justify-center">
                            <span className="font-semibold">İşlemler</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 border-t border-gray-300">
                      {diet.Oguns.map((ogun, index) => (
                        <Draggable
                          key={index.toString()}
                          draggableId={index.toString()}
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`divide-x divide-gray-300 hover:bg-gray-50/80 cursor-move transition-colors duration-150 ${
                                highlightedIndex === index
                                  ? "ring-2 ring-indigo-400 animate-bounce"
                                  : ""
                              }`}
                            >
                              <td
                                style={{ width: `${columnWidths.ogun}%` }}
                                className="px-3 py-3 align-top"
                              >
                                <div className="space-y-2">
                                  <Input
                                    style={{ fontSize }}
                                    type="text"
                                    value={ogun.name}
                                    onChange={(e) =>
                                      handleOgunChange(
                                        index,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    className="w-full h-12 font-bold text-xl border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                  <div className="no-print">
                                    <OgunQuickActions
                                      ogunName={ogun.name}
                                      ogunItems={ogun.items}
                                      onApplyPreset={(preset) =>
                                        handleApplyPreset(index, preset)
                                      }
                                    />
                                  </div>
                                </div>
                              </td>
                              <td
                                style={{ width: `${columnWidths.saat}%` }}
                                className="px-3 py-3 align-top"
                              >
                                <Input
                                  style={{ fontSize }}
                                  type="text"
                                  value={ogun.time}
                                  onChange={(e) =>
                                    handleOgunChange(
                                      index,
                                      "time",
                                      e.target.value
                                    )
                                  }
                                onBlur={() => onMealTimeBlur?.(index)}
                                  className="w-full h-12 font-medium border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                disabled={effectiveDisabled}
                                />
                              </td>
                              <td
                                style={{ width: `${columnWidths.menu}%` }}
                                className="p-3 align-top"
                              >
                                <div className="space-y-4 overflow-visible min-h-[120px]">
                                  {ogun.items.map((item, itemIndex) => (
                                    <div
                                      key={itemIndex}
                                      className="break-words"
                                    >
                                      <MenuItemComponent
                                        item={item}
                                        index={itemIndex}
                                        ogunIndex={index}
                                        onDelete={(itemIndex) =>
                                          handleDeleteMenuItem(index, itemIndex)
                                        }
                                        onItemChange={handleMenuItemChange}
                                      />
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    onClick={() => handleAddMenuItem(index)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium mt-2 no-print transition-colors duration-200"
                                    size="sm"
                                  >
                                    Yeni Öğe Ekle
                                  </Button>
                                </div>
                              </td>
                              <td
                                style={{ width: `${columnWidths.aciklama}%` }}
                                className="px-3 py-3 align-top"
                              >
                                <div className="flex flex-col space-y-1 w-full">
                                  <label
                                    htmlFor={`note-${index}`}
                                    className="text-sm text-gray-700 font-medium"
                                  >
                                    Açıklama
                                  </label>
                                  <div className="flex gap-2">
                                    <Textarea
                                      id={`note-${index}`}
                                      value={ogun.detail || ""}
                                      onChange={(e) =>
                                        handleOgunChange(
                                          index,
                                          "detail",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Öğüne Özel Açıklamalar Girebilirsiniz."
                                      className="resize-none h-20 text-sm flex-1"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 no-print text-center align-top">
                                <div className="flex flex-col gap-2 items-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSortMenuItems(index)}
                                    disabled={disabled || ogun.items.length < 2}
                                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  >
                                    <ArrowDownUp className="w-4 h-4 mr-1" />
                                    Öncelik Sırala
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveOgun(index)}
                                    disabled={disabled}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <Trash className="w-4 h-4" />
                                    Sil
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                    <tfoot className="border-t-2 border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <td colSpan={5} className="p-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={onAddOgun}
                            className="
                            bg-white 
                            text-purple-700 
                            border-2 
                            border-purple-700 
                            hover:bg-purple-50 
                            hover:text-purple-800 
                            transition-all 
                            duration-200 
                            shadow-sm 
                            hover:shadow-md
                            font-medium
                          "
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Öğün Ekle
                          </Button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DietTable;
