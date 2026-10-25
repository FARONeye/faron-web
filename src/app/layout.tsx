import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import { siteConfig } from "@/config/site";
import { isStripeConfigured } from "@/lib/stripe";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const sans = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "FARØN — PROJECT 001 — VEIL",
    template: "%s — FARØN",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: "FARØN",
    title: "FARØN — PROJECT 001 — VEIL",
    description: siteConfig.description,
    images: [{ url: "/media/lookbook/concept-front.jpg", width: 442, height: 450, alt: "T-shirt PROJECT 001 — VEIL" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#050507",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}>
      <body className="min-h-svh bg-void text-bone">
        <a href="#contenu" className="label sr-only z-[100] bg-bone px-4 py-3 text-void focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Aller au contenu
        </a>
        <SmoothScroll />
        <Header />
        <CartDrawer checkoutReady={isStripeConfigured()} />
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
