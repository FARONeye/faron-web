"use client";

import type Lenis from "lenis";

let lenis: Lenis | null = null;
let locks = 0;

export function registerLenis(instance: Lenis | null) {
  lenis = instance;
}

/** Bloque le défilement de la page (tiroir panier, visionneuse 3D, menu mobile). */
export function lockScroll() {
  locks += 1;
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  lenis?.start();
  document.documentElement.style.overflow = "";
}

export function scrollToElement(target: string | HTMLElement) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.8 });
  else el.scrollIntoView({ behavior: "smooth" });
}
