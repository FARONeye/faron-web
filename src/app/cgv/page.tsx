import type { Metadata } from "next";
import { commerce } from "@/config/commerce";
import { legalEntity } from "@/config/site";
import { TextPage } from "@/components/layout/TextPage";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  alternates: { canonical: "/cgv" },
};

export default function TermsPage() {
  const e = legalEntity;
  return (
    <TextPage eyebrow="Informations légales" title="Conditions générales de vente" draft>
      <h2>1. Objet et vendeur</h2>
      <p>
        Les présentes conditions régissent les ventes conclues sur ce site entre <Placeholder value={e.companyName}>raison sociale</Placeholder>{" "}
        (SIRET <Placeholder value={e.siret}>numéro</Placeholder>, <Placeholder value={e.address}>adresse</Placeholder>) et tout client
        consommateur.
      </p>

      <h2>2. Produits</h2>
      <p>
        Les caractéristiques essentielles des produits sont présentées sur chaque fiche produit. Les visuels de concept signalés comme tels ne
        sont pas contractuels.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises. Les frais de livraison sont indiqués avant la validation de la commande :{" "}
        <Placeholder value={commerce.shipping.costs}>grille des frais de livraison</Placeholder>
      </p>

      <h2>4. Commande</h2>
      <p>
        La commande est validée après acceptation des présentes conditions et paiement. Un e-mail de confirmation récapitulant la commande est
        adressé au client : <Placeholder>modalités d&apos;envoi de la confirmation</Placeholder>
      </p>

      <h2>5. Paiement</h2>
      <p>
        Le paiement est exigible à la commande. Il est traité par Stripe ; les moyens de paiement acceptés sont ceux proposés sur la page de
        paiement. FARØN n&apos;a pas accès aux données de carte bancaire.
      </p>

      <h2>6. Livraison</h2>
      <p>
        Zones : <Placeholder value={commerce.shipping.international}>pays livrés</Placeholder>. Délais :{" "}
        <Placeholder value={commerce.shipping.delays}>délais de livraison</Placeholder>. Transporteurs :{" "}
        <Placeholder value={commerce.shipping.carriers}>transporteurs</Placeholder>.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Conformément aux articles L221-18 et suivants du Code de la consommation, le client dispose d&apos;un délai de quatorze jours à compter de
        la réception du produit pour exercer son droit de rétractation, sans avoir à motiver sa décision. Le remboursement intervient dans les
        quatorze jours suivant la rétractation, dans les conditions prévues par la loi.
      </p>
      <p>
        Procédure : <Placeholder value={commerce.returns.procedure}>procédure et formulaire de rétractation</Placeholder>. Frais de retour :{" "}
        <Placeholder value={commerce.returns.returnCosts}>prise en charge</Placeholder>.
      </p>

      <h2>8. Garanties légales</h2>
      <p>
        Les produits bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie
        des vices cachés (articles 1641 et suivants du Code civil).
      </p>

      <h2>9. Médiation et litiges</h2>
      <p>
        En cas de litige, le client peut recourir gratuitement au médiateur de la consommation :{" "}
        <Placeholder value={e.mediator}>nom et coordonnées du médiateur</Placeholder>. Les présentes conditions sont soumises au droit français.
      </p>
    </TextPage>
  );
}
