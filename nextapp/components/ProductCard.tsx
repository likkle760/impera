"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Product, gbp } from "@/lib/products";

const TYPE_LABEL = { tool: "Tool", education: "Education", membership: "Membership" } as const;

export default function ProductCard({ p }: { p: Product }) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="h-full">
      <Link href={`/${p.slug === "impera-bot" ? "bot" : p.slug === "ebook" ? "ebook" : "mentorship"}`} className="card group flex h-full flex-col overflow-hidden">
        {/* abstract visual */}
        <div className="relative h-44 overflow-hidden border-b border-white/[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(320px_140px_at_30%_20%,rgba(255,255,255,0.09),transparent_70%)] transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold text-white/[0.07] transition-transform duration-500 group-hover:scale-110 group-hover:text-white/[0.12]">
            {p.name.split(" ").map((w) => w[0]).join("")}
          </div>
          <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-silver backdrop-blur">
            {TYPE_LABEL[p.type]}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-xl font-bold tracking-tight">{p.name}</h3>
            <div className="text-right">
              {p.oldPrice && <span className="mr-2 text-xs text-silver/60 line-through">{gbp(p.oldPrice)}</span>}
              <span className="font-display text-lg font-extrabold">{gbp(p.price)}</span>
              {p.type === "membership" && <span className="text-xs text-silver">/mo</span>}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-silver/80">{p.tagline}</p>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-silver">{p.description}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-all duration-300 group-hover:gap-3">
            {p.cta} <ArrowUpRight size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
