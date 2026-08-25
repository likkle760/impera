"use client";
import Link from "next/link";
import { ReactNode } from "react";

export default function AuthShell({ title, sub, children, footer }: {
  title: string; sub?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <section className="container-x flex max-w-md flex-col py-24">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-3 text-sm text-silver">{sub}</p>}
      <div className="card mt-8 p-7">{children}</div>
      {footer && <p className="mt-6 text-center text-[13px] text-silver">{footer}</p>}
      <Link href="/" className="mt-8 text-center text-[12px] text-silver/60 hover:text-silver">&larr; Back to Impera</Link>
    </section>
  );
}
