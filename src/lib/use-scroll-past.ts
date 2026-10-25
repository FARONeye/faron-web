"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  window.addEventListener("resize", cb);
  return () => {
    window.removeEventListener("scroll", cb);
    window.removeEventListener("resize", cb);
  };
};

/** Vrai quand la page a défilé au-delà de `px` pixels (ou d'une fraction de la hauteur d'écran si `vh`). */
export function useScrollPast(amount: number, unit: "px" | "vh" = "px") {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > (unit === "vh" ? (window.innerHeight * amount) / 100 : amount),
    () => false,
  );
}
