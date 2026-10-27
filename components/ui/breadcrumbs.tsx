import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StudentsListLink } from "@/components/students/students-list-link";

export type Crumb = { label: string; href?: string };

// Every crumb but the last is a link; the last is the current page. Long
// names truncate rather than wrapping the trail onto a second line.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-foreground-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
              {item.href === "/students" && !isLast ? (
                // Returns to the page / search / filter you were on, not always page 1.
                <StudentsListLink className="max-w-40 truncate hover:text-foreground hover:underline">
                  {item.label}
                </StudentsListLink>
              ) : item.href && !isLast ? (
                <Link href={item.href} className="max-w-40 truncate hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "max-w-56 truncate text-foreground" : "max-w-40 truncate"}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight aria-hidden className="size-3.5 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
