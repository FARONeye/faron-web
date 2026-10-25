import Link from "next/link";

export default function NotFound() {
  return (
    <div className="static-space flex min-h-svh flex-col items-center justify-center gap-8 px-4 text-center">
      <p className="label text-mist">Erreur 404</p>
      <h1 className="display text-metal text-[clamp(3rem,8vw,7rem)]">Hors du visible.</h1>
      <p className="max-w-sm text-bone/70">Cette page n&apos;existe pas, ou plus.</p>
      <Link href="/" className="btn btn-ghost">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
