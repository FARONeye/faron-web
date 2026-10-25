"use client";

import { useProgress } from "@react-three/drei";

/** Indicateur de chargement des ressources 3D (textures, modèle GLB). */
export function LoaderOverlay({ className = "" }: { className?: string }) {
  const { progress, active } = useProgress();
  const done = !active && progress >= 100;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${done ? "opacity-0" : "opacity-100"} ${className}`}
    >
      <div className="flex w-40 flex-col items-center gap-3">
        <span className="label text-mist">Chargement {Math.round(progress)} %</span>
        <span className="relative h-px w-full overflow-hidden bg-white/10">
          <span className="absolute inset-y-0 left-0 bg-silver transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </span>
      </div>
    </div>
  );
}
