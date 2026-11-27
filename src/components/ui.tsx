"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { AccountDTO } from "@/lib/types";

/* ---------- fetch helper ---------- */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

/* ---------- toasts ---------- */
type Toast = { id: number; tone: "ok" | "error"; text: string };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border border-line bg-elev2 px-4 py-3 text-[13.5px] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)]"
            >
              {t.tone === "ok" ? (
                <CheckCircle2 className="mt-px size-4 shrink-0 text-ok" />
              ) : (
                <AlertCircle className="mt-px size-4 shrink-0 text-danger" />
              )}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- buttons ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};
export function Button({ variant = "secondary", size = "md", loading, className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-elev2 text-ink hover:bg-[#262626]",
    ghost: "text-ink hover:bg-elev",
    danger: "bg-danger/12 text-danger hover:bg-danger/20",
  }[variant];
  const s = size === "sm" ? "h-8 px-3 text-[13px] rounded-lg" : "h-10 px-4 text-[14px] rounded-xl";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-[background,transform,opacity] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 ${v} ${s} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- toggle ---------- */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-40 ${checked ? "bg-accent" : "bg-[#3a3a3a]"}`}
    >
      <motion.span
        className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
        animate={{ x: checked ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 35 }}
      />
    </button>
  );
}

/* ---------- platform glyphs (authored, single stroke weight) ---------- */
export function PlatformGlyph({ platform, className = "size-3" }: { platform: string; className?: string }) {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M14 8.5V7c0-.7.3-1 1-1h1.8V3H14c-2.6 0-3.6 1.6-3.6 3.9v1.6H8V11.5h2.4V21H14v-9.5h2.5l.4-3H14z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M16.6 3h-3.2v12.2a2.8 2.8 0 1 1-2.8-2.8c.3 0 .6 0 .9.1V9.2a6 6 0 1 0 5.1 6V9.1a7.6 7.6 0 0 0 4.4 1.4V7.3A4.4 4.4 0 0 1 16.6 3z" />
        </svg>
      );
    default:
      return null;
  }
}

const BADGE_BG: Record<string, string> = {
  instagram: "bg-[linear-gradient(45deg,#fa7e1e,#d62976,#962fbf)]",
  facebook: "bg-[#1877f2]",
  youtube: "bg-[#ff0033]",
  tiktok: "bg-[#111] ring-1 ring-white/25",
};

/* ---------- avatar with story ring + platform badge ---------- */
export function Avatar({ account, size = 56, ring = true, badge = true }: { account: AccountDTO; size?: number; ring?: boolean; badge?: boolean }) {
  const off = account.status !== "connected";
  const initials = account.name.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const badgeSize = Math.max(16, Math.round(size * 0.34));
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} title={`${account.name} · ${account.platform}${off ? " · reconnect needed" : ""}`}>
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: ring && !off ? (account.platform === "instagram" ? "var(--ring-ig)" : "#3a3a3a") : "#262626", padding: Math.max(2, size * 0.04) }}
      >
        <span className="block size-full rounded-full bg-bg p-[2px]">
          {account.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatar} alt="" className={`size-full rounded-full object-cover ${off ? "opacity-40 grayscale" : ""}`} loading="lazy" />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full bg-elev2 font-semibold text-muted" style={{ fontSize: size * 0.3 }}>
              {initials}
            </span>
          )}
        </span>
      </span>
      {badge && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full text-white ring-[2.5px] ring-bg ${BADGE_BG[account.platform] ?? "bg-elev2"}`}
          style={{ width: badgeSize, height: badgeSize }}
        >
          <PlatformGlyph platform={account.platform} className="size-[58%]" />
        </span>
      )}
    </span>
  );
}

/** Close drawers and dialogs with Escape. */
export function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

/* ---------- page header ---------- */
export function PageHeader({ title, sub, actions }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
      <div>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.015em] text-balance md:text-[44px]">{title}</h1>
        {sub && <p className="mt-2 max-w-[60ch] text-[14.5px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatWhen(iso: string | null) {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "2026-11-28T18:00" in local time, for datetime-local inputs. */
export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const STATUS_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-faint", text: "text-muted" },
  pending: { label: "Off", dot: "bg-faint", text: "text-muted" },
  scheduled: { label: "Scheduled", dot: "bg-accent", text: "text-accent" },
  published: { label: "Published", dot: "bg-ok", text: "text-ok" },
  partial: { label: "Partly published", dot: "bg-warn", text: "text-warn" },
  failed: { label: "Failed", dot: "bg-danger", text: "text-danger" },
  skipped: { label: "Skipped", dot: "bg-line-strong", text: "text-faint" },
};
