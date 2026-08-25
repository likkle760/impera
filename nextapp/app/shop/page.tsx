"use client";
import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { PRODUCTS } from "@/lib/products";

const FILTERS = ["All", "Tools", "Education", "Membership"] as const;

export default function Shop() {
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const items = PRODUCTS.filter((p) => f === "All" || p.type === f.toLowerCase());
  return (
    <section className="container-x py-24 sm:py-32">
      <Reveal className="mb-12 max-w-xl">
        <p className="kicker mb-3">Shop</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">IMPERA Products</h1>
        <p className="mt-4 text-silver">Education, mentorship and professional tools — each built around one goal: a repeatable process.</p>
      </Reveal>

      <Reveal delay={0.1} className="mb-10 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)}
            className={`rounded-full px-5 py-2 text-[13px] transition-all duration-300 ${
              f === x ? "bg-white text-black font-semibold" : "hairline text-silver hover:text-white"
            }`}>{x}</button>
        ))}
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.1}><ProductCard p={p} /></Reveal>
        ))}
      </div>
    </section>
  );
}
