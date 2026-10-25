"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/config/site";
import { cartCount, useCart } from "@/lib/cart-store";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { useScrollPast } from "@/lib/use-scroll-past";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const scrolled = useScrollPast(24);
  const pastHero = useScrollPast(60, "vh");
  const count = useCart((s) => cartCount(s.lines));
  const openCart = useCart((s) => s.open);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const showLogo = !isHome || pastHero || menuOpen;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-700 ease-[var(--ease-luxe)] ${
          scrolled || menuOpen ? "border-b border-white/[0.06] bg-void/75 backdrop-blur-md" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto grid h-[var(--header-h)] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8">
          <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="label link-underline py-1 text-silver transition-colors hover:text-bone aria-[current=page]:text-bone"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="label -ml-2 justify-self-start p-2 text-silver md:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Fermer" : "Menu"}
          </button>

          <Link
            href="/"
            aria-label="FARØN — accueil"
            className={`transition-opacity duration-700 ${showLogo ? "opacity-100" : "pointer-events-none opacity-0"}`}
            tabIndex={showLogo ? 0 : -1}
          >
            <Logo className="h-[18px] sm:h-[22px]" />
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="label link-underline justify-self-end py-1 text-silver transition-colors hover:text-bone"
            aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
          >
            Panier <span className="tabular-nums text-mist">({count})</span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="menu-mobile"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-center gap-2 bg-void/95 px-6 pt-[var(--header-h)] backdrop-blur-lg md:hidden"
          >
            {[...siteConfig.nav, { label: "PANIER", href: "/panier" }].map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="display block py-2 text-5xl text-silver aria-[current=page]:text-bone"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6">
              {siteConfig.footerNav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="label text-mist">
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
