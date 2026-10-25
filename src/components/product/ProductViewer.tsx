"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { veil } from "@/config/product";
import { useGraphicsTier } from "@/lib/graphics";

const ShirtViewer = dynamic(() => import("@/components/three/ShirtViewer"), { ssr: false });

/** Visionneuse 3D chargée à la demande, avec repli image si WebGL est indisponible. */
export function ProductViewer({ className = "", active = true }: { className?: string; active?: boolean }) {
  const tier = useGraphicsTier();

  if (tier === "none") {
    return (
      <div className={`relative bg-charcoal ${className}`}>
        <Image src={veil.media.front.src!} alt={veil.media.front.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain" priority />
        <p className="label absolute inset-x-0 bottom-4 text-center text-mist">Vue 3D indisponible sur cet appareil · visuel de concept</p>
      </div>
    );
  }

  return tier ? <ShirtViewer quality={tier} className={className} active={active} /> : <div className={`bg-charcoal ${className}`} />;
}
