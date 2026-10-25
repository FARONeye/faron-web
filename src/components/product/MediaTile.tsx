import Image from "next/image";
import type { MediaItem } from "@/config/product";
import { siteConfig } from "@/config/site";

type Props = {
  item: MediaItem;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/** Visuel produit ; signale les visuels de concept et les photos encore à fournir. */
export function MediaTile({ item, sizes, className = "", priority }: Props) {
  if (!item.src) {
    if (!siteConfig.showPlaceholders) return null;
    return (
      <figure className={`relative flex items-center justify-center border border-dashed border-[#a08ce6]/40 bg-charcoal ${className}`}>
        <figcaption className="label px-4 text-center text-[#b7aee0]">
          À DÉFINIR · {item.label}
          <span className="mt-2 block text-mist/70 normal-case tracking-normal">Photo du produit réel, haute définition</span>
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className={`group relative overflow-hidden bg-charcoal ${className}`}>
      <Image
        src={item.src}
        alt={item.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-[1.03]"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-void/80 to-transparent p-3">
        <span className="label text-silver">{item.label}</span>
        {item.concept && <span className="label text-[0.55rem] text-mist">Visuel de concept · non contractuel</span>}
      </figcaption>
    </figure>
  );
}
