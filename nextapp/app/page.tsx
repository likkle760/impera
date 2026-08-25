"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import HeroCanvas from "@/components/HeroCanvas";
import Reveal from "@/components/Reveal";
import ProductCard from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/products";

export default function Home() {
  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;
  const up = reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden border-b border-white/[0.06]">
        <HeroCanvas />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div className="container-x relative py-24 text-center">
          <motion.p {...up} transition={{ duration: 0.8, ease }}
            className="kicker mx-auto mb-7 inline-block rounded-full hairline px-4 py-2">
            Education &nbsp;&middot;&nbsp; Mentorship &nbsp;&middot;&nbsp; Tools
          </motion.p>

          <motion.h1
            {...up} transition={{ duration: 0.9, delay: 0.1, ease }}
            className="font-display text-[13vw] font-extrabold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl"
          >
            <span className="grad-text">TRADE WITH PURPOSE.</span><br />
            <span className="text-white/35">BUILD REAL SKILL.</span>
          </motion.h1>

          <motion.p {...up} transition={{ duration: 0.9, delay: 0.22, ease }}
            className="mx-auto mt-8 max-w-2xl text-balance text-base leading-relaxed text-silver sm:text-lg">
            Education, mentorship and professional trading tools designed to help you understand
            the markets, build discipline and develop a repeatable process.
          </motion.p>

          <motion.div {...up} transition={{ duration: 0.9, delay: 0.34, ease }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/shop" className="btn-primary w-full sm:w-auto">Explore Impera</Link>
            <Link href="/mentorship" className="btn-secondary w-full sm:w-auto">View Mentorship</Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <div className="h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-white/40 to-transparent" />
        </motion.div>
      </section>

      {/* ---------- PRODUCT SHOWCASE ---------- */}
      <section className="py-24 sm:py-32">
        <div className="container-x">
          <Reveal className="mb-14 text-center">
            <p className="kicker mb-3">Products</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">BUILT FOR THE SERIOUS TRADER</h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.12}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PHILOSOPHY ---------- */}
      <section className="border-y border-white/[0.06] bg-panel/40 py-24 sm:py-32">
        <div className="container-x grid gap-12 md:grid-cols-2">
          <Reveal>
            <p className="kicker mb-3">Philosophy</p>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Trading isn&rsquo;t about predicting<br className="hidden sm:block" /> every move.
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-silver">
              It&rsquo;s about understanding markets, preparing properly, controlling risk and executing
              a plan you can repeat. That is what we teach — and what our tools reinforce.
            </p>
            <Link href="/about" className="btn-secondary mt-8 inline-flex">Our approach</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 self-center">
            {["Understanding", "Preparation", "Risk control", "Discipline", "Execution", "Review"].map((w, i) => (
              <Reveal key={w} delay={i * 0.08}>
                <div className="card flex h-24 items-center justify-center px-4 text-center">
                  <span className="text-sm font-medium tracking-wide text-mist">{w}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden py-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_240px_at_50%_110%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className="container-x relative">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Start building your process.</h2>
            <p className="mx-auto mt-5 max-w-lg text-silver">
              Join IMPERA and learn the way professionals approach the market — one structured step at a time.
            </p>
            <Link href="/mentorship#pricing" className="btn-primary mt-9 inline-flex">Join Impera</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
