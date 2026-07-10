"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted transition-colors duration-150 hover:bg-surface-muted hover:text-foreground active:scale-[0.94]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`h-[18px] w-[18px] transition-[transform,opacity] duration-200 ease-[var(--ease-out)] ${
          theme === "dark" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        } absolute`}
      >
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`h-[18px] w-[18px] transition-[transform,opacity] duration-200 ease-[var(--ease-out)] ${
          theme === "dark" ? "scale-100 opacity-100" : "scale-50 opacity-0"
        } absolute`}
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
