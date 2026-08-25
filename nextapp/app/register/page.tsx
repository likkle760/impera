"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { api, setToken } from "@/lib/api";

export default function Register() {
  const r = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const d = await api.register(f.name.trim(), f.email.trim(), f.password);
      setToken(d.token);
      window.dispatchEvent(new Event("impera-auth"));
      r.push("/dashboard");
    } catch (e2: any) { setErr(e2.message); setBusy(false); }
  };

  return (
    <AuthShell title="Create your account." sub="Access your purchases, downloads and mentorship in one place."
      footer={<>Already have an account? <Link href="/login" className="text-white underline underline-offset-4">Login</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <input required placeholder="Full name" value={f.name} onChange={set("name")} className="field" />
        <input required type="email" placeholder="Email" value={f.email} onChange={set("email")} className="field" />
        <input required type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={set("password")} className="field" />
        {err && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{err}</p>}
        <button disabled={busy} className="btn-primary w-full !py-3.5">{busy ? "Creating…" : "Register"}</button>
      </form>
    </AuthShell>
  );
}
