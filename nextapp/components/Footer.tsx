import Link from "next/link";
import { BRAND } from "@/lib/products";

const COLS = [
  { h: "Products", links: [["Mentorship", "/mentorship"], ["Bot", "/bot"], ["Ebook", "/ebook"], ["Shop", "/shop"]] },
  { h: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["FAQ", "/faq"], ["Dashboard", "/dashboard"]] },
  { h: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund Policy", "/refund-policy"], ["Risk Disclosure", "/risk-disclosure"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-panel/40">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="font-display text-xl font-extrabold tracking-widest2">{BRAND.name}<span className="text-white/40">.</span></div>
          <p className="mt-3 text-sm leading-relaxed text-silver">
            Trading Education &bull; Mentorship &bull; Tools
          </p>
          <p className="mt-4 text-xs text-silver/70">{BRAND.domain}</p>
        </div>
        {COLS.map((c) => (
          <div key={c.h}>
            <div className="kicker mb-4">{c.h}</div>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-silver transition-colors hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06] py-6">
        <p className="container-x text-center text-[11px] leading-relaxed text-silver/60">
          &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved. Trading involves substantial risk of loss.
          Educational content only — nothing on this site is financial advice.
        </p>
      </div>
    </footer>
  );
}
