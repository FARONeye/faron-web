import type { Metadata } from "next";
import { legalEntity } from "@/config/site";
import { TextPage } from "@/components/layout/TextPage";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = {
  title: "Mentions légales",
  alternates: { canonical: "/mentions-legales" },
};

export default function LegalNoticePage() {
  const e = legalEntity;
  return (
    <TextPage eyebrow="Informations légales" title="Mentions légales" draft>
      <h2>Éditeur du site</h2>
      <ul>
        <li>
          Dénomination : <Placeholder value={e.companyName}>raison sociale ou nom de l&apos;entrepreneur</Placeholder>
        </li>
        <li>
          Forme juridique : <Placeholder value={e.legalForm}>forme juridique</Placeholder>
        </li>
        <li>
          Capital social : <Placeholder value={e.shareCapital}>capital social (si société)</Placeholder>
        </li>
        <li>
          Siège : <Placeholder value={e.address}>adresse du siège</Placeholder>
        </li>
        <li>
          SIRET : <Placeholder value={e.siret}>numéro SIRET</Placeholder>
        </li>
        <li>
          RCS / RNE : <Placeholder value={e.rcs}>immatriculation</Placeholder>
        </li>
        <li>
          TVA intracommunautaire : <Placeholder value={e.vatNumber}>numéro de TVA</Placeholder>
        </li>
        <li>
          Contact : <Placeholder value={e.email}>e-mail</Placeholder> · <Placeholder value={e.phone}>téléphone</Placeholder>
        </li>
        <li>
          Directeur de la publication : <Placeholder value={e.publicationDirector}>nom</Placeholder>
        </li>
      </ul>

      <h2>Hébergement</h2>
      <ul>
        <li>
          Hébergeur : <Placeholder value={e.host.name}>nom de l&apos;hébergeur</Placeholder>
        </li>
        <li>
          Adresse : <Placeholder value={e.host.address}>adresse de l&apos;hébergeur</Placeholder>
        </li>
        <li>
          Téléphone : <Placeholder value={e.host.phone}>téléphone de l&apos;hébergeur</Placeholder>
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque FARØN, le signe Ø, les textes, visuels, modèles 3D et éléments graphiques de ce site sont protégés. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </TextPage>
  );
}
