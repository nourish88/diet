import { create } from 'zustand';

// Font size store interface
interface FontState {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

// Create the font store
export const useFontStore = create<FontState>((set) => ({
  fontSize: 16,
  increase: () => set((state) => ({ fontSize: state.fontSize + 1 })),
  decrease: () => set((state) => ({ fontSize: state.fontSize - 1 })),
  reset: () => set({ fontSize: 16 }),
}));

// Diet store interface (if you're using it)
interface DietState {
  diet: any; // Replace 'any' with your actual Diet type
  setDiet: (diet: any) => void;
}

// Create the diet store
export const useDietStore = create<DietState>((set) => ({
  diet: null,
  setDiet: (diet) => set({ diet }),
}));
