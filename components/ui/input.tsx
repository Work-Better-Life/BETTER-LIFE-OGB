import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, onWheel, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
          className
        )}
        onWheel={
          type === "number"
            ? (e) => {
                // Prevents the browser's default "scroll wheel while focused
                // changes the value by one step" behavior on number inputs —
                // otherwise an accidental scroll silently nudges a score.
                e.currentTarget.blur();
                onWheel?.(e);
              }
            : onWheel
        }
        {...props}
      />
    );
  }
);

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// For a native <input type="file">. The browser's own button is a bare line of
// text, so this gives the picker a solid dashed outline and its button a
// bordered green fill, so it's obvious where to click. The colours are the
// theme's green tokens, which keep strong contrast in both light and dark mode
// (outline about 4:1 in light and 7:1 in dark against the card; button text
// about 5:1 and 7:1). The neutral "muted" greys look nearly invisible in light
// mode, so they aren't used here.
export const fileInputClasses =
  "block w-full cursor-pointer rounded-md border-2 border-dashed border-primary bg-transparent p-2 text-sm text-foreground transition-colors hover:bg-primary-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-primary file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-strong file:transition-colors hover:file:bg-primary hover:file:text-primary-foreground";
