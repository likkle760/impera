"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { API } from "@/lib/api";
import { getProduct } from "@/lib/products";

interface Acct { sessionId: string; product: string; amount?: string; password?: string; licenceKey?: string | null }

function Inner() {
  const p = useSearchParams();
  const cancelled = p.get("cancelled") === "1";
  const orderId = p.get("token");
  const slug = p.get("bot") || "";
  const product = getProduct(slug);
  const [acct, setAcct] = useState<Acct | null>(null);
  const [state, setState] = useState<"working"|"done"|"pending"|"error">(cancelled ? "error" : "working");
  const [msg, setMsg] = useState(cancelled ? "Payment was cancelled — you have not been charged." : "");
  const tries = useRef(0);

  useEffect(() => {
    if (!orderId || cancelled) return;
    let stop = false;
    const capture = async () => {
      try {
        const r = await fetch(API + "/api/paypal/capture/" + encodeURIComponent(orderId), { method: "POST" });
        const d = await r.json();
        if (stop) return;
        if (d.sessionId) { setAcct(d); setState("done"); return; }
        if (d.pending && tries.current < 6) { tries.current++; setTimeout(capture, 3000); setState("working"); return; }
        setState("error"); setMsg(d.detail || "We couldn't verify your payment automatically. Contact support and we'll sort it out.");
      } catch { if (!stop && ++tries.current > 6) { setState("error"); setMsg("Connection issue while verifying payment."); } else if (!stop) setTimeout(capture, 3000); }
    };
    capture();
    return () => { stop = true; };
  }, [orderId, cancelled]);

  const isMentorship = slug.includes("mentor");
  const isEbook = slug === "ebook";

  return (
    <section className="container-x max-w-lg py-28 text-center">
      {state === "done" && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-2xl">&#10003;</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">WELCOME TO IMPERA<span className="text-white/35">.</span></h1>
          <p className="mt-4 text-silver">Your purchase was successful{acct?.amount ? ` — ${acct.amount}` : ""}.<br />
            Your access has been added to your account.</p>
          <p className="mt-6 rounded-xl hairline px-5 py-4 text-sm leading-relaxed text-mist">
            {isMentorship && <>Your IMPERA mentorship membership is now active.<br />Book your first session inside the dashboard.</>}
            {isEbook && <>Your ebook is now available in Downloads.</>}
            {!isMentorship && !isEbook && <>Your bot access is now available in Downloads.<br />Licence key: <b className="font-mono text-white">{acct?.licenceKey}</b></>}
          </p>
          {acct?.password && (
            <p className="mt-4 text-[13px] text-silver">
              Dashboard login: <b className="text-white">{p.get("email")}</b> &middot; Temporary password: <b className="font-mono text-white">{acct.password}</b>
            </p>
          )}
          <Link href="/dashboard?tab=downloads" className="btn-primary mt-9 inline-flex w-full sm:w-auto">Go to Dashboard</Link>
          <p className="mt-4 text-[11px] text-silver/50">A confirmation email is on its way to you.</p>
        </motion.div>
      )}

      {state === "working" && (
        <div className="py-16">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-white/15 border-t-white" />
          <h1 className="mt-8 font-display text-2xl font-bold">Verifying your payment…</h1>
          <p className="mt-3 text-silver">This only takes a moment. Please keep this page open.</p>
        </div>
      )}

      {state === "error" && (
        <div className="py-10">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{cancelled ? "Order not completed" : "Something went wrong"}</h1>
          <p className="mt-4 text-silver">{msg}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={product ? `/checkout?product=${product.slug}` : "/shop"} className="btn-primary">Try again</Link>
            <Link href="/contact" className="btn-secondary">Contact support</Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={<div className="container-x py-32 text-center text-silver">Loading…</div>}><Inner /></Suspense>;
}
