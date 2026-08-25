import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getProduct } from "@/lib/products";
import { Check, X } from "lucide-react";

export const metadata: Metadata = { title: "Impera Bot", description: "Automate your strategy. Trade with structure." };

const p = getProduct("impera-bot")!;

export default function BotPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] py-28 sm:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_70%_0%,rgba(255,255,255,0.05),transparent_65%)]" />
        <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="kicker mb-4">Algorithmic Tool · MetaTrader 5</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              IMPERA BOT<span className="text-white/35">.</span>
            </h1>
            <p className="mt-6 font-display text-xl text-white/80">Automate your strategy.<br />Trade with structure.</p>
            <p className="mt-5 max-w-md leading-relaxed text-silver">{p.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href={`/checkout?product=${p.slug}`} className="btn-primary">Buy Impera Bot — £{p.price}</Link>
              <span className="text-xs text-silver/60">Instant licence delivery · MT5</span>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
                <span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-emerald-400/50" />
                <span className="ml-3 text-[11px] tracking-[0.18em] text-silver">IMPERA BOT · DEMO PANEL</span>
              </div>
              <div className="space-y-3 p-6 font-mono text-[12px] leading-relaxed">
                {[["EURUSD M5","BUY filled","+0.42R"],["GBPUSD M5","SELL filled","+0.31R"],["XAUUSD M15","waiting","—"],["Session filter","London · NY","on"],["Trailing stop","step 8 pts","active"]].map(([a,b,c]) => (
                  <div key={a} className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-mist">{a}</span><span className="text-silver">{b}</span>
                    <span className={String(c).startsWith("+") ? "text-emerald-300/90" : "text-silver/60"}>{c}</span>
                  </div>
                ))}
                <p className="pt-2 text-[10px] text-silver/50">Illustrative interface only. No performance data is shown or implied.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="container-x grid gap-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-6 space-y-5 text-sm leading-relaxed text-silver">
              {["Purchase and receive your licence key instantly by email.",
                "Install the EA file into your MetaTrader 5 Experts folder.",
                "Attach it to your chosen chart and paste your licence key.",
                "Define your risk settings — the bot executes the strategy mechanically."].map((s,i)=>(
                <li key={i} className="flex gap-4"><span className="font-display text-white/30">{String(i+1).padStart(2,"0")}</span>{s}</li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-2xl font-bold tracking-tight">Who it&rsquo;s for</h2>
            <ul className="mt-6 space-y-3 text-sm text-silver">
              {["Traders who already have a defined strategy","Anyone wanting consistent, rules-based execution","Traders who want emotion removed from execution"].map(t=>(
                <li key={t} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300/70" />{t}</li>
              ))}
            </ul>
            <h3 className="mt-8 font-display text-lg font-bold">Who it&rsquo;s NOT for</h3>
            <ul className="mt-4 space-y-3 text-sm text-silver">
              {["Anyone expecting guaranteed profits — no system can promise that","People unwilling to define risk before every trade","Complete beginners with zero market understanding (start with the ebook or mentorship)"].map(t=>(
                <li key={t} className="flex gap-3"><X size={16} className="mt-0.5 shrink-0 text-red-300/60" />{t}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-panel/40 py-20 text-center">
        <div className="container-x">
          <Reveal>
            <p className="kicker mb-3">Risk note</p>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-silver">
              Trading involves substantial risk. The Impera Bot is an execution tool, not a profit guarantee.
              Past performance of any strategy does not guarantee future results. See our{" "}
              <Link href="/risk-disclosure" className="underline underline-offset-4 hover:text-white">risk disclosure</Link>.
            </p>
            <Link href={`/checkout?product=${p.slug}`} className="btn-primary mt-8 inline-flex">Buy Impera Bot — £{p.price}</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
