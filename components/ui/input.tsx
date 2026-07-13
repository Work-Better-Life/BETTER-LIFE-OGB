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
