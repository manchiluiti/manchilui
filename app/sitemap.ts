import type { MetadataRoute } from "next";
import { PAGES } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `https://manchilui.com${p.href === "/" ? "" : p.href}`, changeFrequency: "monthly", priority: p.href === "/" ? 1 : 0.7 }));
}
