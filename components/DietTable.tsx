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
import { Clock, Coffee, FileText, Menu, Trash } from "lucide-react";

interface DietTableProps {
  setDiet: (diet: Diet | ((prevDiet: Diet) => Diet)) => void;
  diet: Diet;
  contextId: string;
  fontSize: number;
  handleOgunChange: (index: number, field: keyof Ogun, value: string) => void;
  handleRemoveOgun: (index: number) => void;
  handleAddMenuItem: (ogunIndex: number) => void;
  handleMenuItemChange: (ogunIndex: number, itemIndex: number, field: string, value: string) => void;
  disabled?: boolean;
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
}: DietTableProps) => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState({
    ogun: 18,
    saat: 10,
    menu: 42,
    aciklama: 30,
  });
  const [isBrowser, setIsBrowser] = useState(false);

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

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
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
                            className="divide-x divide-gray-300 hover:bg-gray-50/80 cursor-move transition-colors duration-150"
                          >
                            <td
                              style={{ width: `${columnWidths.ogun}%` }}
                              className="px-3 py-3 align-top"
                            >
                              <Input
                                style={{ fontSize }}
                                type="text"
                                value={ogun.name}
                                onChange={(e) =>
                                  handleOgunChange(index, "name", e.target.value)
                                }
                                className="w-full h-12 font-bold text-xl border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
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
                                  handleOgunChange(index, "time", e.target.value)
                                }
                                className="w-full h-12 font-medium border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td
                              style={{ width: `${columnWidths.menu}%` }}
                              className="p-3 align-top"
                            >
                              <div className="space-y-4 overflow-visible min-h-[120px]">
                                {ogun.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="break-words">
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
                                  placeholder="Öğüne özel notlar veya açıklamalar (emoji kullanabilirsiniz 😊 veya :smile:, :heart:, :fire:, :check:, :x: yazarak)"
                                  className="resize-none h-20 text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 no-print text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleRemoveOgun(index)}
                                className="no-print p-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 inline-flex items-center"
                                aria-label="Sil"
                              >
                                <Trash className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default DietTable;
