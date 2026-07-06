import { create } from "zustand";

interface CanvasStore {
  selectedNodeId: string | null;
  isConfigPanelOpen: boolean;
  selectNode: (id: string | null) => void;
  closeConfigPanel: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  selectedNodeId: null,
  isConfigPanelOpen: false,
  selectNode: (id) =>
    set({ selectedNodeId: id, isConfigPanelOpen: id !== null }),
  closeConfigPanel: () => set({ isConfigPanelOpen: false }),
}));
