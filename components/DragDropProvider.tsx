"use client";
import { createContext, useId } from "react";

// Rename to CustomDragDropContext to avoid name collision with react-beautiful-dnd
export const CustomDragDropContext = createContext({ contextId: "0" });

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  // Use a consistent string ID instead of a number from useState
  // This ensures the same value is used on both server and client
  return (
    <CustomDragDropContext.Provider value={{ contextId: "0" }}>
      {children}
    </CustomDragDropContext.Provider>
  );
}
