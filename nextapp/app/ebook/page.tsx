import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getProduct } from "@/lib/products";
import { Check } from "lucide-react";

export const metadata: Metadata = { title: "Trading Guide Ebook", description: "Your first step toward understanding the markets." };

const p = getProduct("ebook")!;

const CHAPTERS = [
  "Trading basics — what markets really are",
  "Candlesticks: reading price action",
  "Charts, timeframes & structure",
  "Buying and selling mechanics",
  "Risk management fundamentals",
  "Choosing your market — forex, metals, futures, stocks",
  "Building a simple strategy",
  "TP / SL, buy stops and sell stops",
  "Signals, discipline & psychology",
  "The trading journal — your edge tracker",
];

export default function EbookPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] py-28 sm:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_30%_0%,rgba(255,255,255,0.05),transparent_65%)]" />
        <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="kicker mb-4">Digital Guide · PDF + Web Edition</p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              IMPERA TRADING GUIDE<span className="text-white/35">.</span>
            </h1>
            <p className="mt-6 font-display text-xl text-white/80">Your first step toward<br />understanding the markets.</p>
            <p className="mt-5 max-w-md leading-relaxed text-silver">{p.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href={`/checkout?product=${p.slug}`} className="btn-primary">Buy the Ebook — £{p.price}</Link>
              <span className="text-xs text-silver/60">Instant delivery to your dashboard</span>
            </div>
          </Reveal>

          {/* cover + preview mock */}
          <Reveal delay={0.15}>
            <div className="relative mx-auto max-w-xs">
              <div className="absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),transparent)]" />
              <div className="card relative aspect-[3/4] rotate-[-4deg] transition-transform duration-500 hover:rotate-0">
                <div className="flex h-full flex-col justify-between p-7">
                  <span className="font-display text-sm font-extrabold tracking-widest2">IMPERA<span className="text-white/40">.</span></span>
                  <div>
                    <div className="font-display text-2xl font-extrabold leading-tight">THE PRECISION<br />TRADING PLAYBOOK</div>
                    <p className="mt-2 text-[11px] tracking-wide text-silver">A COMPLETE BEGINNER&rsquo;S GUIDE</p>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full opacity-25"><polyline fill="none" stroke="white" strokeWidth="2" points="0,50 30,42 55,46 85,28 115,34 150,14 200,20"/></svg>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="kicker mb-3">Contents</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Table of contents</h2>
            <p className="mt-4 text-sm leading-relaxed text-silver">Ten focused chapters that take you from zero to a working trading process.</p>
            <ul className="mt-7 space-y-3">
              {CHAPTERS.map((c, i) => (
                <li key={c} className="flex gap-4 border-b border-white/[0.05] pb-3 text-sm text-silver">
                  <span className="font-display text-white/25">{String(i + 1).padStart(2, "0")}</span>{c}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="kicker mb-3">Benefits</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Why this guide</h2>
            <ul className="mt-7 space-y-4">
              {["Written for complete beginners — no jargon walls","Focused on understanding, not hype or signals","Includes journal templates you can use today","Reads in one evening, useful for years","Instant access after purchase — delivered privately to your dashboard"].map(b=>(
                <li key={b} className="flex gap-3 text-sm text-silver"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300/80" />{b}</li>
              ))}
            </ul>
            <Link href={`/checkout?product=${p.slug}`} className="btn-primary mt-10 inline-flex">Get the Ebook — £{p.price}</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
