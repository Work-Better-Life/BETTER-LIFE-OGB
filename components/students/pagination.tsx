"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { pageItems } from "@/lib/pagination";

const baseClasses =
  "inline-flex size-9 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const idleClasses = "border-border bg-surface-muted text-foreground hover:bg-border/60";
const currentClasses = "border-primary bg-primary-soft text-primary-strong";
const disabledClasses = "cursor-not-allowed border-border bg-surface-muted/50 text-foreground-muted opacity-50";

// First / previous / next / last. With no `href` it's drawn greyed out and isn't a link.
function StepLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (href === null) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(baseClasses, disabledClasses)}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(baseClasses, idleClasses)}>
      {children}
    </Link>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  // Keeps every other filter (search, sort, cohort) and only changes the page.
  function hrefFor(target: number) {
    const params = new URLSearchParams(searchParams);
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-foreground-muted">
        {total > 0 && page >= 1 && first <= total ? `Showing ${first}–${last} of ${total}` : `Page ${page} of ${totalPages}`}
      </p>

      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
        <StepLink href={page <= 1 ? null : hrefFor(1)} label="First page">
          <ChevronsLeft aria-hidden className="size-4" />
        </StepLink>
        <StepLink href={page <= 1 ? null : hrefFor(page - 1)} label="Previous page">
          <ChevronLeft aria-hidden className="size-4" />
        </StepLink>

        {pageItems(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <Link
              key={item}
              href={hrefFor(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={cn(baseClasses, item === page ? currentClasses : idleClasses)}
            >
              {item}
            </Link>
          ) : (
            <span key={item} aria-hidden className="inline-flex size-9 items-center justify-center text-sm text-foreground-muted">
              …
            </span>
          ),
        )}

        <StepLink href={page >= totalPages ? null : hrefFor(page + 1)} label="Next page">
          <ChevronRight aria-hidden className="size-4" />
        </StepLink>
        <StepLink href={page >= totalPages ? null : hrefFor(totalPages)} label="Last page">
          <ChevronsRight aria-hidden className="size-4" />
        </StepLink>
      </nav>
    </div>
  );
}
