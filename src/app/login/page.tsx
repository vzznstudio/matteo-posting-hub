"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const d = await res.json().catch(() => ({}));
    setError(d.error || "Sign-in failed");
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px]"
      >
        <h1 className="font-display text-[48px] leading-[0.98] tracking-[-0.02em]">
          Matteo&rsquo;s
          <br />
          <em className="italic">Posting Hub</em>
        </h1>
        <p className="mt-4 text-muted">Post once, publish everywhere.</p>
        <label className="mt-10 block">
          <span className="sr-only">Password</span>
          <div className="relative">
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="field h-12 pr-14"
              aria-invalid={!!error}
            />
            <button
              disabled={!password || busy}
              aria-label="Sign in"
              className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg bg-accent text-white transition-opacity disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
        </label>
        {error && <p className="mt-3 text-[13px] text-danger" role="alert">{error}</p>}
      </motion.form>
    </main>
  );
}
