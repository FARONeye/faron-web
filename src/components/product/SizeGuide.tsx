"use client";

import { useEffect, useRef } from "react";
import { SIZES, type Product } from "@/config/product";
import { lockScroll, unlockScroll } from "@/lib/scroll";

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
};

export function SizeGuide({ product, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d || !open) return;
    d.showModal();
    lockScroll();
    return () => {
      d.close();
      unlockScroll();
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      // Échap passe par « cancel » : l'événement « close » est aussi émis par le close() du nettoyage de l'effet
      // (double montage de React en mode strict), ce qui refermait aussitôt la fenêtre.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="size-guide-title"
      data-lenis-prevent
      className="m-auto max-h-[90svh] w-[min(46rem,calc(100vw-2rem))] overflow-y-auto border border-white/10 bg-charcoal p-0 text-bone backdrop:bg-void/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
        <h2 id="size-guide-title" className="label text-bone">
          Guide des tailles — {product.name}
        </h2>
        <button type="button" onClick={onClose} className="label link-underline text-silver hover:text-bone">
          Fermer
        </button>
      </div>
      <div className="flex flex-col gap-6 px-6 py-6">
        <p className="text-sm leading-relaxed text-bone/70">
          Mesures du vêtement fini, en centimètres, prises à plat sur la pièce non étirée. Pour choisir, comparez-les à un T-shirt que vous
          aimez porter, posé à plat.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="sr-only">Mesures par taille, en centimètres</caption>
            <thead>
              <tr className="border-b border-white/10">
                <th scope="col" className="label py-3 pr-4 text-left font-normal text-mist">
                  Mesure (cm)
                </th>
                {SIZES.map((s) => (
                  <th key={s} scope="col" className="label px-3 py-3 text-right font-normal text-bone">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.measurements.map((m) => (
                <tr key={m.label} className="border-b border-white/[0.05]">
                  <th scope="row" className="py-3 pr-4 text-left font-normal text-bone/75">
                    {m.label}
                  </th>
                  {SIZES.map((s) => (
                    <td key={s} className="px-3 py-3 text-right tabular-nums text-bone">
                      {m.values[s]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="label leading-relaxed text-[#b7aee0]">{product.measurementsStatus}</p>
        <p className="text-xs leading-relaxed text-bone/55">
          HPS : point haut de l&apos;épaule, à la jonction du col. La largeur des panneaux latéraux est comprise dans la largeur de poitrine.
        </p>
      </div>
    </dialog>
  );
}
