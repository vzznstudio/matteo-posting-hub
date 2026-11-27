"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { CalendarClock, Images, LogOut, PlusSquare, Settings2, UsersRound } from "lucide-react";
import { ToastProvider } from "./ui";

const NAV = [
  { href: "/", label: "Create", icon: PlusSquare },
  { href: "/queue", label: "Queue", icon: CalendarClock },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/setup", label: "Setup", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="md:flex">
          {/* Desktop rail */}
          <aside className="hidden md:flex sticky top-0 h-dvh w-[244px] shrink-0 flex-col border-r border-line px-3 pt-8 pb-5 xl:w-[272px]">
            <Link href="/" className="mb-10 block px-3">
              <span className="font-display text-[26px] leading-[1.05] tracking-[-0.01em]">
                Matteo&rsquo;s
                <br />
                <em className="italic">Posting Hub</em>
              </span>
            </Link>
            <nav className="flex flex-1 flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center gap-4 rounded-xl px-3 py-3 text-[15px] transition-colors hover:bg-elev ${
                    active(href) ? "font-semibold text-ink" : "text-ink/85"
                  }`}
                >
                  {active(href) && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-elev"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon
                    className="relative size-[22px] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110"
                    strokeWidth={active(href) ? 2.4 : 1.8}
                  />
                  <span className="relative">{label}</span>
                </Link>
              ))}
            </nav>
            <button
              onClick={signOut}
              className="flex items-center gap-4 rounded-xl px-3 py-3 text-[15px] text-muted transition-colors hover:bg-elev hover:text-ink"
            >
              <LogOut className="size-[22px]" strokeWidth={1.8} />
              Sign out
            </button>
          </aside>

          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-bg/90 px-4 backdrop-blur-md md:hidden">
            <span className="font-display text-[21px] tracking-[-0.01em]">
              Matteo&rsquo;s <em className="italic">Posting Hub</em>
            </span>
          </header>

          <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>

          {/* Mobile tab bar */}
          <nav
            className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/95 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${active(href) ? "text-ink" : "text-faint"}`}
              >
                <Icon className="size-6" strokeWidth={active(href) ? 2.4 : 1.7} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
