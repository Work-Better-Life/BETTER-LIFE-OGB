import { cn } from "@/lib/cn";

// Shows the student's photo, or a neutral silhouette until one is added.
export function StudentAvatar({
  photo,
  name,
  className,
}: {
  photo: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary-strong",
        className
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- small inline data URL, nothing for next/image to optimise
        <img src={photo} alt={`${name}'s photo`} className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-label="No photo yet" role="img" className="size-3/5 opacity-70">
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.14 0-7.5 2.35-7.5 5.25 0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75C19.5 16.35 16.14 14 12 14Z" />
        </svg>
      )}
    </div>
  );
}
