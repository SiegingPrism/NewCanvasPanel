import { create } from "zustand";

interface OpenAIOptions {
  boardId?: string;
  contextText?: string;
  prompt?: string;
  snapshot?: string;
}

interface AISheetStore {
  isOpen: boolean;
  boardId?: string;
  contextText?: string;
  initialPrompt?: string;
  initialSnapshot?: string;
  openAI: (opts?: OpenAIOptions) => void;
  closeAI: () => void;
  setOpen: (open: boolean) => void;
}

export const useAISheetStore = create<AISheetStore>((set) => ({
  isOpen: false,
  boardId: undefined,
  contextText: undefined,
  initialPrompt: undefined,
  initialSnapshot: undefined,
  openAI: (opts) =>
    set({
      isOpen: true,
      boardId: opts?.boardId,
      contextText: opts?.contextText,
      initialPrompt: opts?.prompt,
      initialSnapshot: opts?.snapshot,
    }),
  closeAI: () =>
    set({
      isOpen: false,
      initialPrompt: undefined,
      initialSnapshot: undefined,
      contextText: undefined,
    }),
  setOpen: (isOpen) =>
    set((state) => {
      if (!isOpen) {
        return {
          isOpen: false,
          initialPrompt: undefined,
          initialSnapshot: undefined,
          contextText: undefined,
        };
      }
      return { isOpen: true };
    }),
}));

