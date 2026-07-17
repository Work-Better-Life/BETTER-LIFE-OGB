"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NAV_ITEMS } from "./nav-items";
import { NavIconGlyph } from "./nav-icon";
import { LogoMark } from "@/components/ui/logo-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-3 px-3">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-primary-soft text-primary-strong"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <NavIconGlyph icon={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark size={50} />
          <span className="font-bold text-base text-foreground text-center">
            BETTER LIFE OGB
          </span>
        </div>
        <NavLinks pathname={pathname} />
        <div className="border-t border-border p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-lg font-bold text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="relative flex h-full w-64 flex-col bg-surface shadow-floating"
              initial={{ transform: "translateX(-100%)" }}
              animate={{ transform: "translateX(0%)" }}
              exit={{ transform: "translateX(-100%)" }}
              transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="flex items-center gap-2.5 px-5 py-5">
                <LogoMark size={30} />
                <span className="font-bold text-base text-foreground">
                  BETTER LIFE OGB
                </span>
              </div>
              <NavLinks
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="border-t border-border p-3">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col md:ml-60">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-muted md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="hidden text-sm text-foreground-muted md:inline">
            Welcome back, {userName}
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
