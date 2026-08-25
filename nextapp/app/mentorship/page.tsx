import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getProduct } from "@/lib/products";
import { Check } from "lucide-react";

export const metadata: Metadata = { title: "Monthly Mentorship", description: "Stop chasing trades. Start building skill." };

const p = getProduct("mentor-monthly")!;

const TOPICS = ["Trading fundamentals","Chart reading","Candlestick analysis","Market structure","Support & resistance","Risk management","Trading psychology","Strategy development","Trade planning","TP & SL placement","Buy stops & sell stops","Understanding signals","Trade reviews","Discipline","Journaling"];

const GETS = ["Structured education","Trading lessons","Market analysis","Strategy breakdowns","Risk-management education","Trading psychology","Community access","Trade reviews","Ongoing guidance"];

export default function MentorshipPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] py-28 text-center sm:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_50%_0%,rgba(255,255,255,0.055),transparent_65%)]" />
        <div className="container-x relative">
          <Reveal>
            <p className="kicker mb-4">IMPERA Monthly Mentorship</p>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
              STOP CHASING TRADES.<br /><span className="text-white/35">START BUILDING SKILL.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl leading-relaxed text-silver">
              A structured monthly programme that teaches you how professionals read markets,
              manage risk and execute with discipline — supported by live sessions and a real community.
            </p>
            <Link href="#pricing" className="btn-primary mt-9 inline-flex">Join Mentorship — £{p.price}/mo</Link>
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="container-x">
          <Reveal className="mb-10 text-center">
            <p className="kicker mb-3">Curriculum</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">What you&rsquo;ll learn</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOPICS.map((t, i) => (
              <Reveal key={t} delay={i * 0.04}>
                <div className="card px-4 py-4 text-center text-[13px] text-mist">{t}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-panel/40 py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <p className="kicker mb-3">Included</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">What you get</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-silver">
              Every month inside IMPERA mentorship, deliberately structured so you always know what to work on next.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {GETS.map((g, i) => (
              <Reveal key={g} delay={i * 0.06}>
                <div className="card flex items-center gap-3 px-5 py-4">
                  <Check size={16} className="shrink-0 text-emerald-300/80" />
                  <span className="text-sm text-mist">{g}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-28">
        <div className="container-x">
          <Reveal className="mx-auto max-w-md">
            <div className="card overflow-hidden text-center">
              <div className="border-b border-white/[0.07] px-8 py-8">
                <p className="kicker mb-2">Monthly Mentorship</p>
                <div className="font-display text-6xl font-extrabold tracking-tight">£{p.price}<span className="text-lg font-medium text-silver">/mo</span></div>
                <p className="mt-2 text-xs text-silver/70">Cancel anytime · No lock-in</p>
              </div>
              <ul className="space-y-3 px-8 py-7 text-left">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-silver"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300/80" />{f}</li>
                ))}
              </ul>
              <div className="border-t border-white/[0.07] p-6">
                <Link href={`/checkout?product=${p.slug}`} className="btn-primary w-full">Join Impera</Link>
                <p className="mt-3 text-[11px] text-silver/60">Secure checkout via PayPal</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
