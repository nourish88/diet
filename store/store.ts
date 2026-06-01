import { create } from "zustand";

interface FontState {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

export const useFontStore = create<FontState>((set) => ({
  fontSize: 16,
  increase: () => set((state) => ({ fontSize: state.fontSize + 1 })),
  decrease: () => set((state) => ({ fontSize: state.fontSize - 1 })),
  reset: () => set({ fontSize: 16 }),
}));
