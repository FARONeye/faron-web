import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/config/product";
import { formatPrice } from "@/lib/format";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: "Collection",
  description: "La collection FARØN. Chapitre 001 : VEIL.",
  alternates: { canonical: "/collection" },
};

const STATUS: Record<string, string> = {
  prelaunch: "Bientôt disponible",
  available: "Disponible",
  soldout: "Épuisé",
};

export default function CollectionPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-[calc(var(--header-h)+8vh)] sm:px-8">
      <header className="mb-16 flex flex-col gap-6 sm:mb-24">
        <p className="label text-mist">Collection</p>
        <h1 className="display text-metal text-[clamp(3rem,9vw,9rem)]">PROJECT 001</h1>
        <p className="max-w-md leading-relaxed text-bone/70">
          Un chapitre, une pièce. FARØN avance par projets numérotés ; le premier s&apos;appelle VEIL.
        </p>
      </header>

      <ul className="grid gap-6">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/collection/${p.slug}`} className="group grid items-stretch gap-0 border border-white/[0.07] bg-charcoal/40 md:grid-cols-[1.1fr_0.9fr]">
              <div className="relative aspect-square overflow-hidden bg-charcoal md:aspect-auto md:min-h-[70vh]">
                <Image
                  src={p.media.front.src!}
                  alt={p.media.front.alt}
                  fill
                  sizes="(min-width: 768px) 55vw, 100vw"
                  className="object-cover transition-transform duration-[2s] ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                  priority
                />
                <span className="label absolute bottom-4 left-4 text-mist">Visuel de concept · non contractuel</span>
              </div>
              <div className="flex flex-col justify-between gap-10 p-6 sm:p-10">
                <div className="flex flex-col gap-4">
                  <p className="label text-mist">001 — {STATUS[p.status]}</p>
                  <h2 className="display text-metal text-[clamp(2.4rem,4.5vw,4.4rem)]">{p.name}</h2>
                  <p className="label text-silver">T-shirt boxy · jersey de coton noir 280 g/m²</p>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone/70">{p.description[1]}</p>
                </div>
                <div className="flex items-end justify-between gap-6 border-t border-white/[0.07] pt-6">
                  <p className="text-lg tabular-nums text-bone">
                    {formatPrice(p.priceCents) ?? <Placeholder fallback="Prix communiqué au lancement">prix TTC</Placeholder>}
                  </p>
                  <span className="label link-underline text-bone">Découvrir la pièce</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
