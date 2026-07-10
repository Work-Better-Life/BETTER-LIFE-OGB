"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function ThemeSection() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function apply(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <div className="flex gap-2">
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => apply(option)}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium capitalize transition-colors duration-150",
            theme === option
              ? "border-primary bg-primary-soft text-primary-strong"
              : "border-border text-foreground-muted hover:bg-surface-muted"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
