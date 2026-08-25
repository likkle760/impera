import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "About", description: "Built to educate. Built to last." };

const PILLARS = ["Understanding", "Preparation", "Risk control", "Discipline", "Execution", "Review"];

export default function About() {
  return (
    <>
      <section className="container-x py-28 text-center sm:py-36">
        <Reveal>
          <p className="kicker mb-4">About Impera</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            BUILT TO EDUCATE.<br /><span className="text-white/35">BUILT TO LAST.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl leading-relaxed text-silver">
            Trading isn&rsquo;t about predicting every move. It&rsquo;s about understanding markets,
            preparing properly, controlling risk, executing with discipline — and reviewing everything honestly.
          </p>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-silver">
            IMPERA exists to help traders build exactly those skills through structured education,
            genuine mentorship and professional tools that reinforce good process.
          </p>
        </Reveal>
      </section>
      <section className="border-t border-white/[0.06] bg-panel/40 py-24">
        <div className="container-x grid grid-cols-2 gap-4 md:grid-cols-3">
          {PILLARS.map((w, i) => (
            <Reveal key={w} delay={i * 0.07}>
              <div className="card flex h-28 items-center justify-center text-center"><span className="font-display text-lg font-bold tracking-wide">{w}</span></div>
            </Reveal>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/mentorship" className="btn-primary inline-flex">Start with mentorship</Link>
        </div>
      </section>
    </>
  );
}
