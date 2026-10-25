"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SizeCode } from "@/config/product";

export type CartLine = {
  productId: string;
  size: SizeCode;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: CartLine, max: number) => void;
  setQuantity: (productId: string, size: SizeCode, quantity: number, max: number) => void;
  remove: (productId: string, size: SizeCode) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const clamp = (n: number, max: number) => Math.max(1, Math.min(max, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line, max) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId && l.size === line.size);
          const lines = existing
            ? state.lines.map((l) => (l === existing ? { ...l, quantity: clamp(l.quantity + line.quantity, max) } : l))
            : [...state.lines, { ...line, quantity: clamp(line.quantity, max) }];
          return { lines, isOpen: true };
        }),
      setQuantity: (productId, size, quantity, max) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId && l.size === size ? { ...l, quantity: clamp(quantity, max) } : l,
          ),
        })),
      remove: (productId, size) =>
        set((state) => ({ lines: state.lines.filter((l) => !(l.productId === productId && l.size === size)) })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: "faron-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Réhydraté après le montage (SmoothScroll) pour éviter tout écart d'hydratation.
      skipHydration: true,
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);
