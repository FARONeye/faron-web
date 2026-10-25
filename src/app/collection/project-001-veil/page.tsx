import type { Metadata } from "next";
import Link from "next/link";
import { galleryOf, veil } from "@/config/product";
import { commerce } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductGallery } from "@/components/product/ProductGallery";
import { MediaTile } from "@/components/product/MediaTile";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: veil.name,
  description: "PROJECT 001 — VEIL : T-shirt boxy légèrement raccourci en jersey de coton noir 280 g/m², broderie Ø-éclipse argent mat, panneaux latéraux respirants.",
  alternates: { canonical: `/collection/${veil.slug}` },
  openGraph: { images: [{ url: veil.media.front.src!, alt: veil.media.front.alt }] },
};

function productJsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: veil.name,
    description: veil.description.join(" "),
    brand: { "@type": "Brand", name: "FARØN" },
    image: [new URL(veil.media.front.src!, siteConfig.url).toString(), new URL(veil.media.back.src!, siteConfig.url).toString()],
    color: "Noir",
  };
  // Aucune offre publiée tant que le prix n'est pas défini.
  if (veil.priceCents !== null && veil.status !== "prelaunch") {
    data.offers = {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (veil.priceCents / 100).toFixed(2),
      availability: veil.status === "soldout" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: new URL(`/collection/${veil.slug}`, siteConfig.url).toString(),
    };
  }
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function ProductPage() {
  return (
    <div className="pt-[var(--header-h)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd() }} />

      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12 xl:gap-16">
        <div className="min-w-0 self-start lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <ProductGallery images={galleryOf(veil)} />
          <p className="label mt-3 text-mist/80 lg:pl-[calc(5rem+0.75rem)] xl:pl-[calc(5.75rem+0.75rem)]">
            Modèle 3D : prototype de coupe boxy, proportions visuelles à valider (cotes : guide des tailles) · rendu indicatif · visuels du lookbook de concept
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-10 lg:py-8">
          <nav aria-label="Fil d'Ariane" className="label text-mist">
            <Link href="/collection" className="link-underline hover:text-bone">
              Collection
            </Link>{" "}
            / <span className="text-silver">{veil.name}</span>
          </nav>

          <header className="flex flex-col gap-4">
            <h1 className="display text-metal text-[clamp(2.6rem,5vw,4.6rem)]">{veil.name}</h1>
            <p className="label text-silver">T-shirt boxy · jersey de coton noir 280 g/m²</p>
          </header>

          <ProductPurchase product={veil} />

          <section aria-labelledby="desc-title" className="flex flex-col gap-4 border-t border-white/[0.07] pt-8">
            <h2 id="desc-title" className="label text-mist">
              Description
            </h2>
            {veil.description.map((p) => (
              <p key={p} className="leading-relaxed text-bone/75">
                {p}
              </p>
            ))}
          </section>

          <section aria-labelledby="specs-title" className="flex flex-col gap-4 border-t border-white/[0.07] pt-8">
            <h2 id="specs-title" className="label text-mist">
              Matière & coupe
            </h2>
            <dl className="divide-y divide-white/[0.06]">
              {veil.specs.map((s) => (
                <div key={s.label} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                  <dt className="text-bone/55">{s.label}</dt>
                  <dd className="text-bone/90">{s.value}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                <dt className="text-bone/55">Composition</dt>
                <dd>
                  <Placeholder value={veil.composition} fallback="Communiquée au lancement">
                    composition mesurée du produit final
                  </Placeholder>
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                <dt className="text-bone/55">Entretien</dt>
                <dd>
                  <Placeholder value={veil.care} fallback="Communiqué au lancement">
                    notice d&apos;entretien
                  </Placeholder>
                </dd>
              </div>
              <div className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                <dt className="text-bone/55">Fabrication</dt>
                <dd>
                  <Placeholder value={veil.madeIn} fallback="Communiquée au lancement">
                    pays de fabrication
                  </Placeholder>
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="ship-title" className="flex flex-col gap-3 border-t border-white/[0.07] pt-8 text-sm">
            <h2 id="ship-title" className="label text-mist">
              Livraison & retours
            </h2>
            <p className="text-bone/75">
              Délais : <Placeholder value={commerce.shipping.delays}>délais de livraison</Placeholder>
            </p>
            <p className="text-bone/75">
              Retours : <Placeholder value={commerce.returns.policy}>politique de retour</Placeholder>
            </p>
            <Link href="/aide" className="label link-underline self-start text-silver hover:text-bone">
              FAQ, livraison et retours
            </Link>
          </section>
        </div>
      </div>

      {siteConfig.showPlaceholders && (
        <section aria-labelledby="pending-title" className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-8">
          <h2 id="pending-title" className="label mb-4 text-mist">
            Photos du produit réel — à venir
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {veil.media.pending.map((m) => (
              <MediaTile key={m.label} item={m} sizes="33vw" className="min-h-28" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
