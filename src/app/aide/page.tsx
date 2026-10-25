import type { Metadata } from "next";
import Link from "next/link";
import { commerce } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { veil } from "@/config/product";
import { TextPage } from "@/components/layout/TextPage";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: "FAQ, livraison et retours",
  description: "Questions fréquentes, livraison et retours — FARØN.",
  alternates: { canonical: "/aide" },
};

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-white/[0.07] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-bone [&::-webkit-details-marker]:hidden">
        <span className="text-[1.05rem]">{q}</span>
        <span aria-hidden className="label text-mist transition-transform duration-500 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export default function HelpPage() {
  return (
    <TextPage eyebrow="Aide" title="FAQ, livraison & retours">
      <section id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions fréquentes</h2>
        <Question q="Quelle taille choisir ?">
          <p>
            {veil.name} a une coupe boxy, carrée et légèrement raccourcie, pensée pour couvrir la ceinture. Le guide des tailles de la fiche produit
            donne les mesures du vêtement à plat ; comparez-les à un T-shirt que vous aimez porter.
          </p>
          <p>{veil.measurementsStatus}</p>
        </Question>
        <Question q="De quelle matière est fait le T-shirt ?">
          <p>
            Le corps est en jersey de coton noir, d&apos;un grammage cible de 280 g/m². Les deux panneaux latéraux, imprimés de motifs géométriques d&apos;inspiration Sak Yant, sont dans une maille micro-mesh
            respirante. Composition exacte : <Placeholder value={veil.composition}>composition mesurée</Placeholder>
          </p>
        </Question>
        <Question q="Comment l'entretenir ?">
          <p>
            <Placeholder value={veil.care} fallback="La notice d'entretien sera communiquée au lancement.">
              notice d&apos;entretien (après tests de lavage)
            </Placeholder>
          </p>
        </Question>
        <Question q="Quand la pièce sera-t-elle disponible ?">
          <p>
            {veil.name} est en cours de développement. Le lancement sera annoncé sur ce site
            {siteConfig.contact.instagram ? " et sur Instagram" : ""}.
          </p>
        </Question>
        <Question q="Le paiement est-il sécurisé ?">
          <p>
            Le paiement s&apos;effectue sur la page sécurisée de Stripe. FARØN ne reçoit ni ne conserve vos données de carte bancaire.
          </p>
        </Question>
      </section>

      <section id="livraison" aria-labelledby="livraison-title">
        <h2 id="livraison-title">Livraison</h2>
        <ul>
          <li>
            Zones desservies : <Placeholder value={commerce.shipping.international}>pays livrés</Placeholder>
          </li>
          <li>
            Transporteurs : <Placeholder value={commerce.shipping.carriers}>transporteurs</Placeholder>
          </li>
          <li>
            Délais : <Placeholder value={commerce.shipping.delays}>délais de préparation et d&apos;acheminement</Placeholder>
          </li>
          <li>
            Frais : <Placeholder value={commerce.shipping.costs}>frais de livraison</Placeholder>
          </li>
        </ul>
      </section>

      <section id="retours" aria-labelledby="retours-title">
        <h2 id="retours-title">Retours</h2>
        <p>
          Conformément au Code de la consommation, vous disposez d&apos;un délai de quatorze jours à compter de la réception de votre commande pour
          exercer votre droit de rétractation, sans avoir à justifier de motif. Les modalités complètes figurent dans les{" "}
          <Link href="/cgv" className="underline underline-offset-4">
            conditions générales de vente
          </Link>
          .
        </p>
        <ul>
          <li>
            Politique de retour FARØN : <Placeholder value={commerce.returns.policy}>politique de retour</Placeholder>
          </li>
          <li>
            Procédure : <Placeholder value={commerce.returns.procedure}>procédure de retour</Placeholder>
          </li>
          <li>
            Frais de retour : <Placeholder value={commerce.returns.returnCosts}>prise en charge des frais de retour</Placeholder>
          </li>
        </ul>
      </section>

      <section id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p>
          Service client : <Placeholder value={siteConfig.contact.email}>e-mail service client</Placeholder>
        </p>
      </section>
    </TextPage>
  );
}
