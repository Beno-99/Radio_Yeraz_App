// stores/navigationStore.ts
import { create } from "zustand";

interface NavigationStore {
  targetPostId: string | null;
  setTargetPostId: (id: string | null) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  targetPostId: null,
  setTargetPostId: (id) => set({ targetPostId: id }),
}));
