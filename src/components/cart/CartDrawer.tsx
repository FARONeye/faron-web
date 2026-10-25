"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cartCount, useCart } from "@/lib/cart-store";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { CartContents } from "./CartContents";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CartDrawer({ checkoutReady }: { checkoutReady: boolean }) {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const count = useCart((s) => cartCount(s.lines));
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    lockScroll();
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-void/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            data-lenis-prevent
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col overflow-y-auto border-l border-white/[0.07] bg-charcoal/95 px-6 pb-8 backdrop-blur-xl sm:px-8"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-white/[0.07]">
              <h2 id="cart-title" className="label text-bone">
                Panier <span className="text-mist">({count})</span>
              </h2>
              <button ref={closeButton} type="button" onClick={close} className="label link-underline text-silver hover:text-bone">
                Fermer
              </button>
            </div>
            <CartContents checkoutReady={checkoutReady} onNavigate={close} />
            <Link href="/panier" onClick={close} className="label link-underline mt-6 self-start text-mist hover:text-bone">
              Voir le panier complet
            </Link>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
