"use client";
import { FormEvent, useState } from "react";
import Reveal from "@/components/Reveal";
import { api } from "@/lib/api";

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState<"idle"|"busy"|"done"|"err">("idle");
  const [msg, setMsg] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setState("busy");
    try { await api.contact(f); setState("done"); }
    catch (e2: any) { setMsg(e2.message || "Could not send right now."); setState("err"); }
  };

  return (
    <section className="container-x max-w-lg py-24">
      <Reveal>
        <p className="kicker mb-3">Contact</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Talk to us<span className="text-white/35">.</span></h1>
        <p className="mt-4 text-sm text-silver">Questions about products, orders or mentorship — we reply personally.</p>
      </Reveal>
      <div className="card mt-9 p-7">
        {state === "done" ? (
          <p className="py-6 text-center text-sm text-emerald-300/90">Message sent. We&rsquo;ll get back to you shortly.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input required placeholder="Name" value={f.name} onChange={set("name")} className="field" />
            <input required type="email" placeholder="Email" value={f.email} onChange={set("email")} className="field" />
            <input required placeholder="Subject" value={f.subject} onChange={set("subject")} className="field" />
            <textarea required rows={5} placeholder="Message" value={f.message} onChange={set("message")} className="field resize-none" />
            {state === "err" && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{msg}</p>}
            <button disabled={state === "busy"} className="btn-primary w-full !py-3.5">{state === "busy" ? "Sending…" : "Send message"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
