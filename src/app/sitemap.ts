import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { products } from "@/config/product";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/collection", "/univers", "/aide", "/mentions-legales", "/confidentialite", "/cgv", ...products.map((p) => `/collection/${p.slug}`)];
  return paths.map((path) => ({ url: new URL(path, siteConfig.url).toString() }));
}
