import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "FAQ", description: "Common questions about Impera." };

const QA: [string, string][] = [
  ["What is IMPERA?", "IMPERA is a trading education brand offering structured mentorship, a beginner trading guide and a professional execution tool for MetaTrader 5."],
  ["Who is the mentorship for?", "Anyone serious about building real skill — from complete beginners to traders who want structure, accountability and honest feedback."],
  ["Is IMPERA suitable for beginners?", "Yes. The ebook and mentorship start from fundamentals: candles, charts, risk and process. No prior experience required."],
  ["What does the bot do?", "It executes a defined strategy mechanically on MetaTrader 5 — entries, exits, stops and position sizing — without emotional interference."],
  ["Is the bot guaranteed to make money?", "No. No trading system can guarantee profits. Trading involves substantial risk and most retail traders lose money. The bot is an execution tool, not an income promise."],
  ["What markets can I trade?", "The education applies across forex, metals, futures and stocks. The bot is configured per market on MT5."],
  ["How does the mentorship subscription work?", "You pay monthly and get full access: live sessions, community and trade reviews. Access continues while your subscription is active."],
  ["Can I cancel my mentorship?", "Yes — anytime. Your access remains until the end of the paid period."],
  ["How do I receive the ebook?", "Immediately after payment it unlocks in your dashboard Downloads section, delivered privately to your account."],
  ["How do I receive the bot?", "Your licence key is emailed instantly and the protected download appears in your dashboard Downloads."],
  ["What happens after payment?", "Payment is verified server-side, your account gets access automatically, and you receive a confirmation email within minutes."],
  ["Is trading risky?", "Yes — very. Leveraged trading can lead to losses greater than expected. Never trade money you cannot afford to lose. Read our full Risk Disclosure."],
];

export default function Faq() {
  return (
    <section className="container-x max-w-3xl py-24">
      <Reveal className="mb-12">
        <p className="kicker mb-3">FAQ</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Questions, answered.</h1>
      </Reveal>
      <div className="space-y-3">
        {QA.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.03}>
            <details className="card group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                {q}<span className="text-silver transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-silver">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
