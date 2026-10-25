type Props = {
  className?: string;
  title?: string;
};

/** Mot-symbole FARØN officiel, rendu en argent métallique. */
export function Logo({ className = "", title = "FARØN" }: Props) {
  return <span role="img" aria-label={title} className={`logo-metal ${className}`} />;
}
