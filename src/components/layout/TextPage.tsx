import { siteConfig } from "@/config/site";

type Props = {
  eyebrow: string;
  title: string;
  /** Avertissement « modèle à valider » affiché tant que les placeholders sont visibles. */
  draft?: boolean;
  children: React.ReactNode;
};

export function TextPage({ eyebrow, title, draft = false, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-[calc(var(--header-h)+8vh)] sm:px-8">
      <p className="label mb-5 text-mist">{eyebrow}</p>
      <h1 className="display text-metal text-[clamp(2.6rem,6vw,4.8rem)]">{title}</h1>
      {draft && siteConfig.showPlaceholders && (
        <p className="placeholder mt-8 block! p-4 leading-relaxed">
          Modèle à compléter et à faire valider par un professionnel du droit avant toute mise en ligne commerciale.
        </p>
      )}
      <div className="prose-legal mt-10">{children}</div>
    </div>
  );
}
