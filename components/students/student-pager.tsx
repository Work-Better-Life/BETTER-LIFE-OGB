import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Neighbor = { id: string; name: string } | null;

const linkClasses =
  "group inline-flex h-9 items-center rounded-md border border-border bg-surface-muted px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/60 focus-visible:bg-border/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The name is collapsed to zero width until the button is hovered or focused,
// then slides open. Touch screens have no hover, so they keep the plain arrow;
// the aria-label still names the student.
const nameClasses =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:max-w-52 group-hover:opacity-100 group-focus-visible:max-w-52 group-focus-visible:opacity-100 motion-reduce:transition-none";

// Previous / next student arrows. `suffix` keeps the reader on the same kind of
// page: "" for the student page, "/profile" for the profile page.
export function StudentPager({
  previous,
  next,
  suffix = "",
}: {
  previous: Neighbor;
  next: Neighbor;
  suffix?: string;
}) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Switch student" className="flex items-center gap-2">
      {previous && (
        <Link
          href={`/students/${previous.id}${suffix}`}
          className={linkClasses}
          aria-label={`Previous student: ${previous.name}`}
        >
          <ArrowLeft aria-hidden className="size-4 shrink-0" />
          <span className={`${nameClasses} group-hover:ml-2 group-focus-visible:ml-2`}>{previous.name}</span>
        </Link>
      )}
      {next && (
        <Link href={`/students/${next.id}${suffix}`} className={linkClasses} aria-label={`Next student: ${next.name}`}>
          <span className={`${nameClasses} group-hover:mr-2 group-focus-visible:mr-2`}>{next.name}</span>
          <ArrowRight aria-hidden className="size-4 shrink-0" />
        </Link>
      )}
    </nav>
  );
}
