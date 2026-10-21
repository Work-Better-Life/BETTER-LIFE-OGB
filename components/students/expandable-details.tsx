"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// The details stay in the DOM when collapsed (just hidden), so the server
// renders them once and toggling is instant.
export function ExpandableDetails({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Show less" : "View all details"}
          <span aria-hidden className={open ? "rotate-180 transition-transform" : "transition-transform"}>
            ▾
          </span>
        </Button>
      </div>
      <div hidden={!open} className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}
