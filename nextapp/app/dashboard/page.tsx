"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { api, getToken, setToken } from "@/lib/api";

interface Purchase { sessionId: string; bot: string; product: string; amount?: string; date?: string; licenceKey?: string | null }
interface Me { name: string; email: string; purchases: Purchase[]; mentorship: { active: boolean; plan: string | null }; }

const TABS = [
  ["overview", "Overview"], ["products", "Products"], ["downloads", "Downloads"],
  ["mentorship", "Mentorship"], ["orders", "Orders"], ["account", "Account"],
] as const;

const isTool = (b: string) => !b.includes("mentor") && b !== "ebook" && !b.includes("membership");

function Inner() {
  const p = useSearchParams();
  const r = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "auth">("loading");
  const tab = (p.get("tab") || "overview") as typeof TABS[number][0];

  useEffect(() => {
    if (!getToken()) { setState("auth"); return; }
    api.me().then((d) => { setMe(d); setState("ready"); }).catch(() => setState("auth"));
  }, []);

  if (state === "loading") return <div className="container-x py-32 text-center text-silver">Loading your IMPERA…</div>;
  if (state === "auth") {
    return (
      <div className="container-x py-32 text-center">
        <h1 className="font-display text-3xl font-extrabold">Please log in</h1>
        <p className="mt-3 text-silver">You need an IMPERA account to view the dashboard.</p>
        <Link href="/login" className="btn-primary mt-8 inline-flex">Login</Link>
      </div>
    );
  }
  if (!me) return null;

  const tools = me.purchases.filter((x) => isTool(x.bot));
  const ebooks = me.purchases.filter((x) => x.bot === "ebook");
  const download = async (slug: string) => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL! + "/api/dl/" + slug, { headers: { Authorization: "Bearer " + getToken() } });
      if (!res.ok) throw new Error("Download unavailable.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = res.headers.get("x-filename") || "impera-download";
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <section className="container-x py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Dashboard</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            WELCOME TO IMPERA<span className="text-white/35">.</span>
          </h1>
        </div>
        <button onClick={async () => { await api.logout().catch(() => {}); setToken(null); window.dispatchEvent(new Event("impera-auth")); r.push("/"); }}
          className="text-[13px] text-silver hover:text-white">Logout</button>
      </div>

      {/* tabs */}
      <div className="scrollbar-none mb-10 flex gap-1 overflow-x-auto rounded-full hairline p-1 sm:w-fit">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/dashboard?tab=${id}`}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] transition-all duration-300 ${
              tab === id ? "bg-white font-semibold text-black" : "text-silver hover:text-white"
            }`}>{label}</Link>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        {tab === "overview" && (
          <div className="grid gap-5 md:grid-cols-3">
            {[["Bot", tools.length ? "ACTIVE" : "—", tools.length], ["Ebook", ebooks.length ? "OWNED" : "—", ebooks.length],
              ["Mentorship", me.mentorship.active ? "ACTIVE" : "NOT ACTIVE", 1]].map(([label, status, owned]) => (
              <Reveal key={String(label)}>
                <div className="card p-6">
                  <p className="kicker mb-6">{label}</p>
                  <p className={`font-display text-2xl font-extrabold ${owned ? "text-emerald-300/90" : "text-white/25"}`}>{status}</p>
                </div>
              </Reveal>
            ))}
            {!me.purchases.length && (
              <div className="card p-8 text-center md:col-span-3">
                <p className="text-silver">Your IMPERA journey starts here.</p>
                <Link href="/shop" className="btn-secondary mt-5 inline-flex">Explore products</Link>
              </div>
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {me.purchases.map((x) => (
              <div key={x.sessionId} className="card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">{x.product}</h3>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-300/90">Owned</span>
                </div>
                <p className="mt-2 text-xs text-silver">{x.amount} · #{x.sessionId.slice(-8).toUpperCase()}</p>
              </div>
            ))}
            {!me.purchases.length && <Empty text="No purchases yet." />}
          </div>
        )}

        {tab === "downloads" && (
          <div className="grid gap-5 sm:grid-cols-2">
            {tools.map((x) => (
              <div key={x.sessionId} className="card p-6">
                <h3 className="font-display font-bold">{x.product}</h3>
                {x.licenceKey && <p className="mt-1 font-mono text-xs text-silver">Licence: {x.licenceKey}</p>}
                <button onClick={() => download(x.bot)} className="btn-primary mt-5 w-full !py-3">Download .mq5</button>
              </div>
            ))}
            {ebooks.map((x) => (
              <div key={x.sessionId} className="card p-6">
                <h3 className="font-display font-bold">{x.product}</h3>
                <p className="mt-1 text-xs text-silver">Web edition · save as PDF inside</p>
                <button onClick={() => download("ebook")} className="btn-primary mt-5 w-full !py-3">Open ebook</button>
              </div>
            ))}
            {!tools.length && !ebooks.length && <Empty text="No digital products have been added to your account yet." />}
          </div>
        )}

        {tab === "mentorship" && (
          <div className="card max-w-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="kicker mb-2">Membership</p>
                <p className={`font-display text-3xl font-extrabold ${me.mentorship.active ? "text-emerald-300/90" : "text-white/25"}`}>
                  {me.mentorship.active ? "ACTIVE" : "INACTIVE"}
                </p>
                {me.mentorship.plan && <p className="mt-1 text-xs uppercase tracking-widest text-silver">{me.mentorship.plan}</p>}
              </div>
              <Link href="/mentorship#pricing" className="btn-secondary !px-5 !py-2.5 text-[12px]">{me.mentorship.active ? "Manage plan" : "Join now"}</Link>
            </div>
            {me.mentorship.active && (
              <>
                <p className="mt-7 text-sm leading-relaxed text-silver">
                  Your membership includes private community access and live sessions.
                  Booking opens from your dashboard below.
                </p>
                <a href="https://impera1.onrender.com/dashboard.html" target="_blank" rel="noopener"
                  className="btn-primary mt-6 inline-flex">Book a session</a>
              </>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-widest text-silver">
                <th className="px-6 py-4 font-medium">Product</th><th className="px-6 py-4 font-medium">Order</th>
                <th className="px-6 py-4 font-medium">Amount</th></tr></thead>
              <tbody>
                {me.purchases.map((x) => (
                  <tr key={x.sessionId} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-6 py-4">{x.product}</td>
                    <td className="px-6 py-4 font-mono text-xs text-silver">#{x.sessionId.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4 text-silver">{x.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!me.purchases.length && <p className="px-6 py-10 text-center text-silver">No orders yet.</p>}
          </div>
        )}

        {tab === "account" && (
          <div className="card max-w-lg p-8">
            <Row k="Name" v={me.name} /><Row k="Email" v={me.email} />
            <Row k="Member products" v={String(me.purchases.length)} />
            <Row k="Mentorship" v={me.mentorship.active ? "Active" : "Not active"} />
          </div>
        )}
      </motion.div>
    </section>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between border-b border-white/[0.05] py-3 last:border-0">
    <span className="text-sm text-silver">{k}</span><span className="text-sm font-medium">{v}</span>
  </div>
);
const Empty = ({ text }: { text: string }) => (
  <div className="card p-10 text-center text-silver sm:col-span-2 lg:col-span-3">{text}</div>
);

export default function DashboardPage() {
  return <Suspense fallback={<div className="container-x py-32 text-center text-silver">Loading…</div>}><Inner /></Suspense>;
}
