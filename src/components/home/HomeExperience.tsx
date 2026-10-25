"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { veil } from "@/config/product";
import { siteConfig } from "@/config/site";
import { useGraphicsTier } from "@/lib/graphics";
import { scrollToElement } from "@/lib/scroll";
import { Logo } from "@/components/ui/Logo";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { CHAPTERS, KEYFRAMES, createRig } from "./rig";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HomeScene = dynamic(() => import("@/components/three/HomeScene"), { ssr: false });
const ExploreOverlay = dynamic(() => import("./ExploreOverlay"), { ssr: false });
const LoaderOverlay = dynamic(() => import("@/components/three/LoaderOverlay").then((m) => m.LoaderOverlay), { ssr: false });

const vh = (n: number) => ({ height: `${n}vh` });

export function HomeExperience() {
  const root = useRef<HTMLDivElement>(null);
  const rigRef = useRef(createRig());
  const tier = useGraphicsTier();
  const reduced = useReducedMotion() ?? false;
  const [exploring, setExploring] = useState(false);
  const webgl = tier === "high" || tier === "lite";
  const closeExplore = useCallback(() => setExploring(false), []);

  useGSAP(
    () => {
      const rig = rigRef.current;
      const story = root.current?.querySelector("[data-story]");
      const product = root.current?.querySelector("#piece");
      if (!story || !product) return;

      if (reduced) rig.intro = 1;
      else gsap.to(rig, { intro: 1, duration: 3.6, delay: 0.2, ease: "power2.inOut" });

      // La chorégraphie est exprimée en vh défilés (somme des chapitres = 720).
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: story, start: "top top", endTrigger: product, end: "top top", scrub: reduced ? true : 1.2 },
      });
      const K = KEYFRAMES;
      if (reduced) {
        Object.assign(rig, { camX: 0, camY: -0.02, camZ: 2.6, tgtX: 0, tgtY: -0.05, tgtZ: 0 });
        tl.to(rig, { rotY: 0.4, reveal: 1, duration: 100 }, 0)
          .to(rig, { rotY: 0, duration: 100 }, 240)
          .to(rig, { rotY: -Math.PI / 2, duration: 60 }, 480)
          .to(rig, { rotY: -Math.PI, duration: 60 }, 600)
          .to(rig, { rotY: K.product.rotY, posX: K.product.posX, studio: 1, duration: 50 }, 670);
      } else {
        tl.to(rig, { ...K.reveal, duration: 100 }, 0)
          .to(rig, { ...K.collar, duration: 120 }, 120)
          .to(rig, { ...K.emblem, duration: 55 }, 300)
          .to(rig, { ...K.sleeve, duration: 55 }, 390)
          .to(rig, { ...K.panel, duration: 70 }, 480)
          .to(rig, { ...K.back, duration: 70 }, 590)
          .to(rig, { ...K.product, duration: 60 }, 660);
      }
      tl.set({}, {}, CHAPTERS.arrival + CHAPTERS.reveal + CHAPTERS.material + CHAPTERS.identity);

      gsap.to("[data-hero]", {
        autoAlpha: 0,
        y: reduced ? 0 : -48,
        ease: "none",
        scrollTrigger: { trigger: story, start: "top top", end: "+=55%", scrub: true },
      });

      for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 12%", scrub: true } })
          .fromTo(el, { autoAlpha: 0, y: reduced ? 0 : 36 }, { autoAlpha: 1, y: 0, duration: 1 })
          .to(el, { autoAlpha: 1, duration: 1.4 })
          .to(el, { autoAlpha: 0, y: reduced ? 0 : -36, duration: 1 });
      }
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <div ref={root} className="relative">
      {webgl && (
        <>
          <HomeScene rigRef={rigRef} quality={tier} animate={!reduced} paused={exploring} eventSource={root} />
          <LoaderOverlay className="fixed z-[5]" />
        </>
      )}
      {tier === "none" && <StaticBackdrop reduced={reduced} />}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,rgba(5,5,7,0.7)_100%)]"
      />

      <div data-story className="relative z-10">
        {/* ARRIVÉE */}
        <section id="arrivee" style={vh(CHAPTERS.arrival)} className="relative" aria-label="FARØN — PROJECT 001 — VEIL">
          <div data-hero className="flex h-svh flex-col items-center justify-between px-4 pb-12 pt-[calc(var(--header-h)+3vh)]">
            <h1 className="hero-in w-[min(80vw,620px)]" style={{ animationDelay: "0.4s" }}>
              <Logo className="w-full" title="FARØN" />
            </h1>
            <div className="flex flex-col items-center gap-5 text-center">
              <p className="label hero-in text-silver" style={{ animationDelay: "1.2s" }}>
                PROJECT 001 — VEIL
              </p>
              <p className="display hero-in text-metal text-[clamp(2.4rem,6.4vw,5.6rem)]" style={{ animationDelay: "1.4s" }}>
                BEYOND THE VISIBLE
              </p>
              <div className="hero-in mt-2 flex flex-wrap justify-center gap-3" style={{ animationDelay: "1.7s" }}>
                <button type="button" className="btn btn-primary" onClick={() => scrollToElement("#revelation")}>
                  Découvrir la pièce
                </button>
                {webgl && (
                  <button type="button" className="btn btn-ghost" onClick={() => setExploring(true)}>
                    Explorer en 3D
                  </button>
                )}
              </div>
            </div>
          </div>
          <div aria-hidden className="absolute bottom-10 right-6 hidden flex-col items-center gap-4 sm:right-10 sm:flex">
            <span className="label text-mist [writing-mode:vertical-rl]">Défiler</span>
            <span className="scroll-cue relative h-16 w-px overflow-hidden bg-white/15" />
          </div>
        </section>

        {/* RÉVÉLATION */}
        <section id="revelation" style={vh(CHAPTERS.reveal)} className="relative flex items-center">
          <div data-reveal className="mx-auto w-full max-w-[1600px] px-6 sm:px-12">
            <p className="label mb-6 text-mist">01 — La révélation</p>
            <h2 className="display text-metal text-[clamp(2.6rem,6.4vw,6.6rem)]">
              UNE SILHOUETTE.
              <br />
              UNE PRÉSENCE.
            </h2>
          </div>
        </section>

        {/* MATIÈRE */}
        <section id="matiere" style={vh(CHAPTERS.material)} className="relative" aria-labelledby="matiere-title">
          <div style={vh(70)} className="flex items-end pb-[12vh]">
            <div data-reveal className="mx-auto w-full max-w-[1600px] px-6 sm:px-12">
              <p className="label mb-6 text-mist">02 — La matière</p>
              <h2 id="matiere-title" className="display mb-8 max-w-[14ch] text-[clamp(2.2rem,4.6vw,4.4rem)] text-bone">
                Un jersey dense, une main mate.
              </h2>
              <ul className="grid max-w-xl grid-cols-2 gap-px bg-white/10">
                {[
                  ["280 g/m²", "Jersey de coton lourd"],
                  ["Boxy", "Coupe légèrement raccourcie"],
                  ["Structurée", "Silhouette qui tient sa forme"],
                  ["Mesurée", "Proportions pensées du S au XL"],
                ].map(([k, v]) => (
                  <li key={k} className="bg-void/70 p-4 backdrop-blur-sm">
                    <p className="display text-2xl text-bone">{k}</p>
                    <p className="label mt-1 text-mist">{v}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Detail height={65} index="Col" title="Bord-côte 1×1, bande finie de 20 mm." text="Ton sur ton, posé sur une encolure nette. Une bande de propreté finit le dos du col." />
          <Detail height={65} index="Broderie" title="Le Ø-éclipse, brodé fil argent mat." text="Environ 20 mm, côté gauche porté. Une lune éclairée : un contour fin qui s'épaissit en croissant." />
          <Detail height={60} index="Manche" title="Longueur normale, proche du biceps." text="Épaules peu tombantes, aucune manche ballon. Une étiquette tissée repliée sur l'ourlet." />
        </section>

        {/* IDENTITÉ */}
        <section id="identite" style={vh(CHAPTERS.identity)} className="relative" aria-labelledby="identite-title">
          <div style={vh(110)} className="flex items-center">
            <div data-reveal className="mx-auto w-full max-w-[1600px] px-6 sm:px-12">
              <p className="label mb-6 text-mist">03 — L&apos;identité</p>
              <h2 id="identite-title" className="display text-metal text-[clamp(2.8rem,7.5vw,7.5rem)]">
                PROJECT 001
                <br />— VEIL
              </h2>
              <p className="mt-8 max-w-md text-base leading-relaxed text-bone/75">
                Deux panneaux latéraux en maille aérée, qui naissent sous le bras et s&apos;ouvrent jusqu&apos;à l&apos;ourlet, visibles de face.
                Des ornements géométriques d&apos;inspiration Sak Yant s&apos;y répondent en plusieurs médaillons, révélés par les panneaux et le mouvement.
              </p>
            </div>
          </div>
          <div style={vh(110)} className="flex items-center justify-end">
            <div data-reveal className="mx-auto w-full max-w-[1600px] px-6 text-right sm:px-12">
              <p className="label mb-4 text-mist">Le dos</p>
              <p className="display ml-auto max-w-[16ch] text-[clamp(2rem,4vw,3.8rem)] text-bone">Au dos, le Ø en métal brossé, au-dessus du milieu. Le nom, discret, sous le col.</p>
            </div>
          </div>
        </section>

        {/* LA PIÈCE */}
        <section id="piece" className="relative min-h-svh" aria-labelledby="piece-title">
          <div className="mx-auto grid min-h-svh max-w-[1600px] items-center gap-10 px-4 pb-20 pt-[calc(var(--header-h)+2rem)] sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div aria-hidden className="h-[42svh] lg:h-auto" />
            <div className="border border-white/[0.08] bg-charcoal/80 p-6 backdrop-blur-xl sm:p-10">
              <p className="label mb-4 text-mist">04 — La pièce</p>
              <h2 id="piece-title" className="display text-metal text-[clamp(2.2rem,4vw,3.6rem)]">
                {veil.name}
              </h2>
              <p className="label mt-3 text-silver">T-shirt boxy · jersey de coton noir 280 g/m²</p>
              <p className="mt-6 text-sm leading-relaxed text-bone/70">{veil.description[0]}</p>
              <div className="mt-8">
                <ProductPurchase product={veil} compact />
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <Link href={`/collection/${veil.slug}`} className="label link-underline text-silver hover:text-bone">
                  Fiche complète
                </Link>
                {webgl && (
                  <button type="button" onClick={() => setExploring(true)} className="label link-underline text-silver hover:text-bone">
                    Explorer en 3D
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>{exploring && webgl && <ExploreOverlay quality={tier} onClose={closeExplore} />}</AnimatePresence>
    </div>
  );
}

function Detail({ height, index, title, text }: { height: number; index: string; title: string; text: string }) {
  return (
    <div style={vh(height)} className="flex items-center">
      <div data-reveal className="mx-auto w-full max-w-[1600px] px-6 sm:px-12">
        <div className="max-w-sm border-l border-white/20 pl-6">
          <p className="label mb-3 text-mist">{index}</p>
          <p className="display text-[clamp(1.8rem,3vw,2.8rem)] leading-tight text-bone">{title}</p>
          <p className="mt-4 text-sm leading-relaxed text-bone/70">{text}</p>
        </div>
      </div>
    </div>
  );
}

/** Repli sans WebGL : fond étoilé statique et visuel de la pièce. */
/** Repli sans WebGL : boucle vidéo rendue depuis le modèle 3D (image fixe si animations réduites). */
function StaticBackdrop({ reduced }: { reduced: boolean }) {
  const video = siteConfig.assets.heroVideo;
  return (
    <div aria-hidden className="static-space fixed inset-0 z-0">
      {reduced ? (
        <Image src={video.poster} alt="" fill sizes="100vw" className="object-cover" priority />
      ) : (
        <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster={video.poster}>
          <source src={video.webmPortrait} type="video/webm" media="(orientation: portrait)" />
          <source src={video.webm} type="video/webm" />
          {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        </video>
      )}
    </div>
  );
}
