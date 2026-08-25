import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <section className="container-x max-w-2xl py-24">
      <Reveal>
        <p className="kicker mb-3">Legal</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-silver">
<h3 className='font-display font-bold text-white'>Data we collect</h3><p>Your name, email address, purchase history and account settings. Payment details are handled entirely by our payment provider (PayPal) and never stored on our servers.</p>
<h3 className='font-display font-bold text-white'>How we use it</h3><p>To deliver purchases, provide access to products, send transactional emails (orders, receipts, session links) and support you.</p>
<h3 className='font-display font-bold text-white'>Your rights</h3><p>You may request export or deletion of your data at any time by contacting support. Transactional records may be retained where required by law.</p>
        </div>
      </Reveal>
    </section>
  );
}
