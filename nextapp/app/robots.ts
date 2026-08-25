import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/products";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin"] }, sitemap: BRAND.url + "/sitemap.xml" };
}
