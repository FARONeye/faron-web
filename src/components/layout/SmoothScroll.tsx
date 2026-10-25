"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { registerLenis } from "@/lib/scroll";
import { useCart } from "@/lib/cart-store";

gsap.registerPlugin(ScrollTrigger);

/** Défilement amorti (désactivé si l'utilisateur préfère réduire les animations). */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    registerLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      registerLenis(null);
    };
  }, [reduced]);

  return null;
}
