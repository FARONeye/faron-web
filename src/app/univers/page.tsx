import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { veil } from "@/config/product";

export const metadata: Metadata = {
  title: "Univers",
  description: "L'univers FARØN : le signe Ø, le voile, la précision. Beyond the visible.",
  alternates: { canonical: "/univers" },
};

export default function UniversPage() {
  return (
    <div className="">
      <section className="static-space relative flex min-h-[92svh] items-end px-4 pb-16 pt-[var(--header-h)] sm:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <p className="label mb-6 text-mist">Univers</p>
          <h1 className="display text-metal max-w-[16ch] text-[clamp(3rem,8vw,8.5rem)]">Ce qui se tient derrière le visible.</h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] items-center gap-12 px-4 py-24 sm:px-8 md:grid-cols-2 md:py-36">
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <Image src="/brand/faron-emblem.png" alt="Le signe Ø de FARØN, en argent" fill sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" />
        </div>
        <div className="flex flex-col gap-6">
          <p className="label text-mist">I — Le signe</p>
          <h2 className="display text-[clamp(2.2rem,4vw,3.8rem)] text-bone">Ø, une éclipse.</h2>
          <p className="max-w-lg leading-relaxed text-bone/75">
            Au cœur du nom, une lettre barrée devient astre : une lune éclairée dont le contour, d&apos;abord fin, s&apos;épaissit en croissant, traversée
            d&apos;un trait. Un seuil entre ce que l&apos;on montre et ce que l&apos;on retient.
          </p>
          <p className="max-w-lg leading-relaxed text-bone/75">
            Sur la pièce, il se fait discret : quelques millimètres brodés en fil argent mat, sans éclat ni artifice.
          </p>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-charcoal/40">
        <div className="mx-auto grid max-w-[1600px] gap-12 px-4 py-24 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:py-36">
          <div className="flex flex-col gap-6 md:order-2 md:pl-12">
            <p className="label text-mist">II — Le voile</p>
            <h2 className="display text-[clamp(2.2rem,4vw,3.8rem)] text-bone">PROJECT 001 — VEIL</h2>
            <p className="max-w-lg leading-relaxed text-bone/75">
              Le premier chapitre est un T-shirt noir. Une forme simple, travaillée jusqu&apos;à la précision : un jersey dense, une silhouette carrée
              qui tient, une longueur qui couvre la ceinture, des manches qui suivent le bras.
            </p>
            <p className="max-w-lg leading-relaxed text-bone/75">
              Le voile, ce sont les côtés : deux panneaux de maille aérée, en pointe sous le bras, qui s&apos;élargissent vers l&apos;ourlet et révèlent au mouvement plusieurs ornements géométriques d&apos;inspiration Sak Yant.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:order-1">
            <figure className="relative aspect-[3/4] overflow-hidden bg-charcoal">
              <Image src="/media/lookbook/concept-portrait.jpg" alt="Silhouette portant le T-shirt VEIL" fill sizes="(min-width: 768px) 22vw, 50vw" className="object-cover" />
            </figure>
            <figure className="relative mt-16 aspect-[3/4] overflow-hidden bg-charcoal">
              <Image src="/media/lookbook/concept-panel-worn.jpg" alt="Panneau latéral du T-shirt VEIL, porté" fill sizes="(min-width: 768px) 22vw, 50vw" className="object-cover" />
            </figure>
            <p className="label col-span-2 text-mist/70">Visuels de concept · non contractuels</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8 md:py-36">
        <p className="label mb-6 text-mist">III — La méthode</p>
        <div className="grid gap-px bg-white/[0.08] md:grid-cols-3">
          {[
            ["Mesurer", "Chaque cote est écrite avant d'être coupée : poitrine, longueur, épaules, manche, ouverture, panneaux."],
            ["Éprouver", "Les prototypes sont portés, lavés, mesurés à nouveau. Une proportion ne vaut que si elle tient sur le corps."],
            ["Retenir", "Rien d'inutile : un signe, deux panneaux, deux étiquettes. Le reste est laissé au noir."],
          ].map(([title, text]) => (
            <div key={title} className="flex flex-col gap-4 bg-void p-8 sm:p-10">
              <h3 className="display text-3xl text-bone">{title}</h3>
              <p className="leading-relaxed text-bone/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center gap-8 px-4 pb-32 text-center">
        <p className="display text-metal text-[clamp(2.4rem,6vw,5.5rem)]">BEYOND THE VISIBLE</p>
        <Link href={`/collection/${veil.slug}`} className="btn btn-primary">
          Découvrir la pièce
        </Link>
      </section>
    </div>
  );
}
