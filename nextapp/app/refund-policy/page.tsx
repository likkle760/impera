import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "Refund Policy" };

export default function Page() {
  return (
    <section className="container-x max-w-2xl py-24">
      <Reveal>
        <p className="kicker mb-3">Legal</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Refund Policy</h1>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-silver">
<h3 className='font-display font-bold text-white'>30-day guarantee</h3><p>If a product doesn&rsquo;t meet your expectations, contact us within 30 days of purchase for a full refund. Digital goods must not have been abusively consumed; we handle each case fairly.</p>
<h3 className='font-display font-bold text-white'>Mentorship</h3><p>Monthly membership can be cancelled anytime before the next billing date. Partial months already started are generally non-refundable, but exceptional cases are considered — just ask.</p>
<h3 className='font-display font-bold text-white'>How to request</h3><p>Email support with your order number via the contact page. Refunds are returned via the original payment method within 5&ndash;10 business days.</p>
        </div>
      </Reveal>
    </section>
  );
}
