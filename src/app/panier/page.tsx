import type { Metadata } from "next";
import { isStripeConfigured } from "@/lib/stripe";
import { CartContents } from "@/components/cart/CartContents";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(var(--header-h)+6vh)] sm:px-8">
      <h1 className="display text-metal mb-10 text-[clamp(2.8rem,6vw,5rem)]">PANIER</h1>
      <CartContents checkoutReady={isStripeConfigured()} />
    </div>
  );
}
