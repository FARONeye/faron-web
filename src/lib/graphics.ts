"use client";

import { useSyncExternalStore } from "react";

/**
 * none : pas de WebGL → visuels statiques.
 * lite : mobile / appareil modeste → géométrie, particules et résolution réduites, pas d'ombres.
 * high : expérience complète.
 */
export type GraphicsTier = "none" | "lite" | "high";

let cached: GraphicsTier | null = null;

function detect(): GraphicsTier {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return "none";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "none";
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (new URLSearchParams(window.location.search).has("lite")) return "lite";
  if (nav.connection?.saveData) return "lite";
  if ((nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4) return "lite";
  if (window.matchMedia("(max-width: 820px) and (pointer: coarse)").matches) return "lite";
  return "high";
}

const subscribe = () => () => {};

/** `null` pendant le rendu serveur et l'hydratation. */
export function useGraphicsTier(): GraphicsTier | null {
  return useSyncExternalStore(
    subscribe,
    () => (cached ??= detect()),
    () => null,
  );
}
