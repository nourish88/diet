import { create } from "zustand";

interface Ogun {
  name: string;
  time: string;
  menuItems: string[];
  notes: string;
}

interface Diet {
  fullName: string;
  dietDate: string;
  weeklyResult: string;
  target: string;
  ogunler: Ogun[];
  waterConsumption: string;
  physicalActivity: string;
}

interface DietStore {
  diet: Diet;
  setDiet: (diet: Diet) => void;
}

export const useDietStore = create<DietStore>((set) => ({
  diet: {
    fullName: "",
    dietDate: "",
    weeklyResult: "",
    target: "",
    ogunler: [],
    waterConsumption: "",
    physicalActivity: "",
  },
  setDiet: (diet) => set({ diet }),
}));

console.log("Exports from store:", { useDietStore });
