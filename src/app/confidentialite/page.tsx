import type { Metadata } from "next";
import { legalEntity } from "@/config/site";
import { TextPage } from "@/components/layout/TextPage";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  alternates: { canonical: "/confidentialite" },
};

export default function PrivacyPage() {
  return (
    <TextPage eyebrow="Informations légales" title="Confidentialité" draft>
      <h2>Responsable du traitement</h2>
      <p>
        <Placeholder value={legalEntity.companyName}>raison sociale</Placeholder>, <Placeholder value={legalEntity.address}>adresse</Placeholder>.
        Contact : <Placeholder value={legalEntity.email}>e-mail dédié aux données personnelles</Placeholder>
      </p>

      <h2>Données traitées sur ce site</h2>
      <ul>
        <li>
          Panier : le contenu de votre panier est enregistré uniquement dans le stockage local de votre navigateur (localStorage). Il n&apos;est pas
          transmis à FARØN avant la commande.
        </li>
        <li>
          Commande et paiement : lors du paiement, vos coordonnées, votre adresse de livraison et vos données de paiement sont collectées par
          Stripe, prestataire de paiement. FARØN reçoit les informations nécessaires à l&apos;exécution de la commande ; les données de carte
          bancaire ne lui sont jamais transmises.
        </li>
        <li>Mesure d&apos;audience : aucun cookie de mesure d&apos;audience ni de publicité n&apos;est déposé par ce site à ce jour.</li>
      </ul>

      <h2>Finalités et bases légales</h2>
      <p>
        Les données de commande sont traitées pour l&apos;exécution du contrat de vente et le respect des obligations légales (comptabilité,
        facturation). Durées de conservation : <Placeholder>durées de conservation par catégorie de données</Placeholder>
      </p>

      <h2>Destinataires et transferts</h2>
      <p>
        Prestataires : Stripe (paiement), <Placeholder>hébergeur, transporteurs, outil d&apos;e-mail</Placeholder>. Transferts hors Union
        européenne et garanties associées : <Placeholder>à préciser selon les prestataires retenus</Placeholder>
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité de vos
        données. Pour l&apos;exercer, écrivez à <Placeholder value={legalEntity.email}>e-mail</Placeholder>. Vous pouvez également introduire une
        réclamation auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>Mise à jour</h2>
      <p>
        Dernière mise à jour : <Placeholder value={legalEntity.lastUpdated}>date</Placeholder>
      </p>
    </TextPage>
  );
}
