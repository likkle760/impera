"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getToken } from "@/lib/api";
import { BRAND } from "@/lib/products";

const LINKS = [
  { href: "/mentorship", label: "Mentorship" },
  { href: "/bot", label: "Bot" },
  { href: "/ebook", label: "Ebook" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setAuthed(!!getToken());
    try { window.dispatchEvent(new Event("impera-auth")); } catch {}
    const h = () => setAuthed(!!getToken());
    window.addEventListener("impera-auth", h);
    return () => window.removeEventListener("impera-auth", h);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "glass border-b border-white/[0.07]" : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-[17px] font-extrabold tracking-widest2">
            {BRAND.name}<span className="text-white/40">.</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className="text-[13px] text-silver transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link href={authed ? "/dashboard" : "/login"} className="text-[13px] text-silver transition-colors hover:text-white">
              {authed ? "Dashboard" : "Login"}
            </Link>
            <Link href="/mentorship#pricing" className="btn-primary !py-2.5">Join Impera</Link>
          </div>

          <button aria-label="Menu" onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full hairline md:hidden">
            <span className="space-y-1.5">
              <span className="block h-px w-5 bg-white" />
              <span className="block h-px w-5 bg-white" />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="container-x flex h-16 items-center justify-between">
              <span className="font-display text-[17px] font-extrabold tracking-widest2">{BRAND.name}<span className="text-white/40">.</span></span>
              <button aria-label="Close" onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full hairline text-lg">×</button>
            </div>
            <motion.nav
              initial="closed" animate="open" variants={{ open: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
              className="container-x mt-8 flex flex-col gap-2"
            >
              {[{ href: "/", label: "Home" }, ...LINKS,
                { href: authed ? "/dashboard" : "/login", label: authed ? "Dashboard" : "Login" },
                { href: "/contact", label: "Contact" }].map((l) => (
                <motion.div key={l.href} variants={{ closed: { opacity: 0, y: 14 }, open: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                  <Link href={l.href} onClick={() => setOpen(false)}
                    className="block border-b border-white/[0.06] py-4 font-display text-2xl font-bold text-white/90">
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <Link href="/mentorship#pricing" onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">Join Impera</Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
