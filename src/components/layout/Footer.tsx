import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/ui/Logo";
import { Placeholder } from "@/components/ui/Placeholder";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-void">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-5">
          <Logo className="h-6 w-auto" />
          <p className="label text-mist">{siteConfig.tagline}</p>
          <p className="max-w-sm text-sm leading-relaxed text-bone/60">
            Maison de streetwear avant-gardiste française. Chapitre en cours : PROJECT 001 — VEIL.
          </p>
        </div>
        <nav aria-label="Navigation secondaire" className="flex flex-col gap-3">
          <p className="label mb-2 text-mist">Maison</p>
          {[...siteConfig.nav, { label: "PANIER", href: "/panier" }].map((item) => (
            <Link key={item.href} href={item.href} className="label link-underline relative self-start text-silver after:absolute after:-inset-y-2 after:inset-x-0 hover:text-bone">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-3">
          <p className="label mb-2 text-mist">Informations</p>
          {siteConfig.footerNav.map((item) => (
            <Link key={item.href} href={item.href} className="link-underline relative self-start text-sm text-bone/70 after:absolute after:-inset-y-1.5 after:inset-x-0 hover:text-bone">
              {item.label}
            </Link>
          ))}
          <p className="mt-4 text-sm text-bone/70">
            Contact : <Placeholder value={siteConfig.contact.email}>e-mail service client</Placeholder>
          </p>
          <p className="text-sm text-bone/70">
            Instagram : <Placeholder value={siteConfig.contact.instagram}>compte officiel</Placeholder>
          </p>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 border-t border-white/[0.06] px-4 py-6 sm:flex-row sm:justify-between sm:px-8">
        <p className="label text-mist/70">© FARØN — Tous droits réservés</p>
        <p className="label text-mist/70">PROJECT 001 — VEIL</p>
      </div>
    </footer>
  );
}
