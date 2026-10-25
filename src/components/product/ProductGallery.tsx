"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/config/product";
import { siteConfig } from "@/config/site";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { ProductViewer } from "./ProductViewer";

type Props = {
  images: MediaItem[];
  className?: string;
};

/** Agrandissement maximal d'un visuel par rapport à sa taille native (au-delà, il devient flou). */
const STAGE_ZOOM = 2;
const LIGHTBOX_ZOOM = 2.5;

const pad = (n: number) => String(n).padStart(2, "0");

/** Balayage horizontal (tactile ou souris) : -1 = précédent, 1 = suivant. */
function useSwipe(onSwipe: (dir: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) onSwipe(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

/**
 * Visuel au format natif : contenu dans son cadre (unités de conteneur, le parent déclare `container-type: size`)
 * et jamais agrandi au-delà de `zoom` fois sa taille réelle.
 */
function FittedImage({ item, zoom, sizes, priority }: { item: MediaItem; zoom: number; sizes: string; priority?: boolean }) {
  const w = item.width ?? 1200;
  const h = item.height ?? 1200;
  return (
    <div className="relative max-h-full max-w-full" style={{ aspectRatio: `${w} / ${h}`, width: `min(100cqw, ${Math.round(w * zoom)}px, calc(100cqh * ${(w / h).toFixed(4)}))` }}>
      <Image src={item.src!} alt={item.alt} fill sizes={sizes} priority={priority} draggable={false} className="select-none object-contain" />
    </div>
  );
}

function ArrowButton({ dir, onClick, className = "" }: { dir: -1 | 1; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? "Visuel précédent" : "Visuel suivant"}
      className={`flex size-11 items-center justify-center border border-white/15 bg-void/60 text-silver backdrop-blur-sm transition-colors hover:border-bone hover:text-bone ${className}`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${dir < 0 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M6 3l5 5-5 5" />
      </svg>
    </button>
  );
}

function Lightbox({ images, index, onIndex, onClose }: { images: MediaItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const go = (dir: -1 | 1) => onIndex((index + dir + images.length) % images.length);
  const swipe = useSwipe(go);
  const item = images[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    lockScroll();
    return () => {
      d.close();
      unlockScroll();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      // Échap passe par « cancel » : l'événement « close » est aussi émis par le close() du nettoyage de l'effet
      // (double montage de React en mode strict), ce qui refermait aussitôt la fenêtre.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      aria-label={`Agrandissement : ${item.label}`}
      data-lenis-prevent
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-void/95 p-0 text-bone backdrop:bg-void/80"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="label text-silver">
            {pad(index + 1)} / {pad(images.length)} · {item.label}
          </p>
          <button type="button" onClick={onClose} className="label link-underline text-silver hover:text-bone" autoFocus>
            Fermer
          </button>
        </div>
        <div
          {...swipe}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 pb-4 [container-type:size] sm:px-20"
        >
          <FittedImage key={item.src} item={item} zoom={LIGHTBOX_ZOOM} sizes="100vw" />
          {images.length > 1 && (
            <>
              <ArrowButton dir={-1} onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 sm:flex" />
              <ArrowButton dir={1} onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:flex" />
            </>
          )}
        </div>
        <p className="label px-4 pb-4 text-center text-mist sm:hidden">Balayer pour changer de visuel</p>
        {item.concept && <p className="label hidden px-6 pb-4 text-center text-[0.55rem] text-mist sm:block">Visuel de concept · non contractuel</p>}
      </div>
    </dialog>
  );
}

/**
 * Galerie produit : la vue 3D interactive puis les visuels du lookbook FARØN.
 * Bureau : vignettes verticales à gauche de l'aperçu. Mobile : aperçu en haut, vignettes défilantes dessous.
 */
export function ProductGallery({ images, className = "" }: Props) {
  // 0 = vue 3D, i ≥ 1 = images[i - 1].
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const thumbs = useRef<HTMLDivElement>(null);
  const count = images.length + 1;
  const go = (dir: -1 | 1) => setActive((a) => (a + dir + count) % count);
  const swipe = useSwipe(go);
  const image = active > 0 ? images[active - 1] : null;

  // Garde la vignette active visible dans la bande défilante (sans faire défiler la page elle-même).
  useEffect(() => {
    const list = thumbs.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !el) return;
    const l = list.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const dx = b.left < l.left ? b.left - l.left : b.right > l.right ? b.right - l.right : 0;
    const dy = b.top < l.top ? b.top - l.top : b.bottom > l.bottom ? b.bottom - l.bottom : 0;
    if (dx || dy) list.scrollBy({ left: dx, top: dy, behavior: "smooth" });
  }, [active]);

  const thumbClass = (i: number) =>
    `relative shrink-0 overflow-hidden border bg-charcoal transition-colors duration-300 size-16 lg:size-auto lg:aspect-square lg:w-full ${
      active === i ? "border-bone" : "border-white/10 hover:border-white/40"
    }`;

  return (
    <div className={`grid gap-3 lg:grid-cols-[5rem_1fr] xl:grid-cols-[5.75rem_1fr] ${className}`}>
      <div
        ref={thumbs}
        role="group"
        aria-label="Vues du produit"
        className="order-2 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:order-1 lg:mx-0 lg:h-[calc(100svh-var(--header-h)-4rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:px-0 lg:pb-0"
        data-lenis-prevent
      >
        <button type="button" data-index={0} onClick={() => setActive(0)} aria-current={active === 0} aria-label="Vue 3D interactive" className={thumbClass(0)}>
          <Image src={siteConfig.assets.heroVideo.poster} alt="" fill sizes="96px" className="object-cover opacity-70" />
          <span className="label absolute inset-0 flex items-center justify-center bg-void/30 text-[0.6rem] text-bone">Vue 3D</span>
        </button>
        {images.map((m, i) => (
          <button
            key={m.src}
            type="button"
            data-index={i + 1}
            onClick={() => setActive(i + 1)}
            aria-current={active === i + 1}
            aria-label={m.label}
            className={thumbClass(i + 1)}
          >
            <Image src={m.src!} alt="" fill sizes="96px" className="object-contain" />
          </button>
        ))}
      </div>

      <div className="relative order-1 h-[62svh] min-h-[22rem] w-full overflow-hidden bg-charcoal lg:order-2 lg:h-[calc(100svh-var(--header-h)-4rem)]">
        <div className={`absolute inset-0 ${image ? "invisible" : ""}`} aria-hidden={image ? true : undefined}>
          <ProductViewer className="h-full w-full" active={!image} />
        </div>

        {image && (
          <figure className="absolute inset-0 flex flex-col">
            <div {...swipe} className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center p-4 [container-type:size] sm:p-10">
              <button type="button" onClick={() => setZoomed(true)} className="cursor-zoom-in" aria-label={`Agrandir : ${image.label}`}>
                <FittedImage key={image.src} item={image} zoom={STAGE_ZOOM} sizes="(min-width: 1024px) 55vw, 100vw" />
              </button>
            </div>
            <figcaption className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
              <span className="label truncate text-silver">
                {pad(active + 1)} / {pad(count)} · {image.label}
              </span>
              {image.concept && <span className="label hidden shrink-0 text-[0.55rem] text-mist sm:inline">Visuel de concept · non contractuel</span>}
            </figcaption>
            <ArrowButton dir={-1} onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <ArrowButton dir={1} onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2" />
            <button type="button" onClick={() => setZoomed(true)} className="chip absolute right-3 top-3">
              Agrandir
            </button>
          </figure>
        )}
      </div>

      {zoomed && image && <Lightbox images={images} index={active - 1} onIndex={(i) => setActive(i + 1)} onClose={() => setZoomed(false)} />}
    </div>
  );
}
