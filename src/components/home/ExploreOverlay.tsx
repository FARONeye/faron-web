"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import ShirtViewer from "@/components/three/ShirtViewer";
import { lockScroll, unlockScroll } from "@/lib/scroll";

type Props = {
  quality: "high" | "lite";
  onClose: () => void;
};

export default function ExploreOverlay({ quality, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    lockScroll();
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explore-title"
      className="fixed inset-0 z-[80] flex flex-col bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-white/[0.06] px-4 sm:px-8">
        <h2 id="explore-title" className="label text-bone">
          PROJECT 001 — VEIL · Exploration 3D
        </h2>
        <button ref={closeButton} type="button" onClick={onClose} className="label link-underline text-silver hover:text-bone">
          Fermer
        </button>
      </div>
      <ShirtViewer quality={quality} className="flex-1" />
    </motion.div>
  );
}
