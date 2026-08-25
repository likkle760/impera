"use client";
import { useEffect, useRef } from "react";

/**
 * Ambient market backdrop: faint grid, slow drifting price-lines,
 * sparse particles. Deliberately subtle; honours reduced motion.
 */
export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, t = 0, running = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    // three price lines with different speeds/phase
    const lines = [
      { speed: 0.0016, amp: 26, yF: 0.42, alpha: 0.16 },
      { speed: 0.0011, amp: 40, yF: 0.58, alpha: 0.10 },
      { speed: 0.0007, amp: 60, yF: 0.70, alpha: 0.06 },
    ];
    const dots = Array.from({ length: 26 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.00022, vy: (Math.random() - 0.5) * 0.00018,
      a: Math.random() * 0.25 + 0.06,
    }));

    const draw = () => {
      if (!running || !ctx) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1 * dpr;
      const step = 72 * dpr;
      for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // price lines
      lines.forEach((l) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6 * dpr) {
          const n = Math.sin(x * 0.004 / dpr + t * l.speed * 8) + Math.sin(x * 0.009 / dpr + t * l.speed * 5);
          const y = h * l.yF + n * l.amp * dpr;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${l.alpha})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
      });

      // particles
      dots.forEach((d) => {
        if (!reduce) { d.x += d.vx; d.y += d.vy; }
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
        if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.a})`;
        ctx.fill();
      });

      t += reduce ? 0 : 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onVis = () => {
      running = document.visibilityState === "visible" && !document.hidden;
      if (running) draw(); else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full opacity-70" />;
}
