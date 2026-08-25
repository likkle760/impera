"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { api } from "@/lib/api";
import { getProduct, gbp } from "@/lib/products";
import { Lock } from "lucide-react";

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const product = getProduct(params.get("product") || "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!product) {
    return (
      <div className="container-x py-32 text-center">
        <h1 className="font-display text-3xl font-extrabold">Product unavailable</h1>
        <p className="mt-4 text-silver">We couldn&rsquo;t find that product.</p>
        <Link href="/shop" className="btn-secondary mt-8 inline-flex">Back to shop</Link>
      </div>
    );
  }

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const d = await api.startCheckout(product.slug, email.trim());
      window.location.href = d.url; // PayPal approval
    } catch (e2: any) {
      setErr(e2.message || "Could not start checkout.");
      setBusy(false);
    }
  };

  return (
    <section className="container-x max-w-xl py-24">
      <Reveal>
        <p className="kicker mb-3">Secure checkout</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Complete your order</h1>

        <div className="card mt-8 p-6">
          <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-4">
            <div>
              <div className="font-display text-lg font-bold">{product.name}</div>
              <p className="text-[13px] text-silver/80">{product.tagline}</p>
            </div>
            <div className="text-right">
              {product.oldPrice && <span className="mr-2 text-sm text-silver/60 line-through">{gbp(product.oldPrice)}</span>}
              <span className="font-display text-2xl font-extrabold">{gbp(product.price)}</span>
              {product.type === "membership" && <span className="text-xs text-silver">/mo</span>}
            </div>
          </div>

          <form onSubmit={pay} className="mt-5 space-y-4">
            <label className="block text-left">
              <span className="mb-2 block text-[12px] uppercase tracking-[0.18em] text-silver">Email for delivery</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="field" />
            </label>
            {err && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{err}</p>}
            <button disabled={busy} className="btn-primary w-full !py-4">
              {busy ? "Redirecting to PayPal…" : `Pay ${gbp(product.price)} with PayPal`}
            </button>
            <p className="flex items-center justify-center gap-2 text-[11px] text-silver/60">
              <Lock size={12} /> Payment verified server-side · Delivery is automatic
            </p>
          </form>
        </div>

        <button onClick={() => router.back()} className="mt-6 text-[13px] text-silver hover:text-white">&larr; Back</button>
      </Reveal>
    </section>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="container-x py-32 text-center text-silver">Loading…</div>}><Inner /></Suspense>;
}
