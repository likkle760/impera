import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return (
    <section className="container-x max-w-2xl py-24">
      <Reveal>
        <p className="kicker mb-3">Legal</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Terms of Service</h1>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-silver">
<h3 className='font-display font-bold text-white'>1. The service</h3><p>IMPERA provides trading education, mentorship and digital tools. Purchases grant a personal, non-transferable licence to use the materials for your own learning and trading.</p>
<h3 className='font-display font-bold text-white'>2. Accounts</h3><p>You are responsible for keeping your account credentials secure. Sharing downloads or course material is prohibited and may result in access being revoked without refund.</p>
<h3 className='font-display font-bold text-white'>3. Payments & renewal</h3><p>Mentorship is billed monthly in advance via our payment provider. You may cancel anytime; access continues until the end of the paid period. One-time products are billed once.</p>
<h3 className='font-display font-bold text-white'>4. No financial advice</h3><p>All content is educational. Nothing provided by IMPERA constitutes personal investment advice or a recommendation to buy or sell any instrument.</p>
<h3 className='font-display font-bold text-white'>5. Liability</h3><p>Trading involves substantial risk. IMPERA is not liable for trading losses incurred through use of educational content or software tools.</p>
        </div>
      </Reveal>
    </section>
  );
}
