import { siteConfig } from "@/config/site";

type Props = {
  /** Valeur réelle ; si elle est absente, l'emplacement réservé s'affiche. */
  value?: string | null;
  /** Ce qu'il faut fournir. */
  children: string;
  /** Texte public affiché à la place quand les placeholders sont masqués. */
  fallback?: string;
};

export function Placeholder({ value, children, fallback = "Information à venir" }: Props) {
  if (value) return <>{value}</>;
  if (!siteConfig.showPlaceholders) return <>{fallback}</>;
  return (
    <span className="placeholder" title="Emplacement réservé — à compléter avant la mise en ligne">
      À DÉFINIR · {children}
    </span>
  );
}
