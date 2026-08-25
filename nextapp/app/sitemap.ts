import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/about", "/mentorship", "/bot", "/ebook", "/shop", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/risk-disclosure"];
  return pages.map((p) => ({ url: BRAND.url + p, lastModified: new Date() }));
}
