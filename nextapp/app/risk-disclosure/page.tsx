import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "Risk Disclosure" };

export default function Page() {
  return (
    <section className="container-x max-w-2xl py-24">
      <Reveal>
        <p className="kicker mb-3">Legal</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Risk Disclosure</h1>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-silver">
<h3 className='font-display font-bold text-white'>Substantial risk</h3><p>Trading leveraged products such as forex, metals and futures carries a high level of risk and can result in the loss of all of your capital, or losses greater than expected. You should never trade with money you cannot afford to lose.</p>
<h3 className='font-display font-bold text-white'>No guarantees</h3><p>Past performance — real or hypothetical — does not guarantee future results. No system, method, bot or educator can promise profits. IMPERA does not guarantee income or success of any kind.</p>
<h3 className='font-display font-bold text-white'>Educational only</h3><p>All content, tools and sessions are for educational purposes and are not personal financial advice. IMPERA is not regulated to provide investment advice. You are solely responsible for your own trading decisions.</p>
        </div>
      </Reveal>
    </section>
  );
}
