"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const d = await api.login(email.trim(), pw);
      setToken(d.token);
      window.dispatchEvent(new Event("impera-auth"));
      r.push("/dashboard");
    } catch (e2: any) { setErr(e2.message); setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back." footer={<>New to IMPERA? <Link href="/register" className="text-white underline underline-offset-4">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        <input required type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} className="field" />
        {err && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{err}</p>}
        <button disabled={busy} className="btn-primary w-full !py-3.5">{busy ? "Signing in…" : "Login"}</button>
        <button type="button" onClick={async () => { if (!email.trim()) return setErr("Enter your email above first."); try { await api.resetRequest(email.trim()); setErr("Reset email sent — check your inbox."); } catch (e2: any) { setErr(e2.message); } }}
          className="w-full text-center text-[12px] text-silver hover:text-white">Forgot password?</button>
      </form>
    </AuthShell>
  );
}
