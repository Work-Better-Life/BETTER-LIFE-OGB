"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The latest address, so the delayed update below builds on whatever filters and
  // page are in the URL when it fires, not what they were when typing began.
  const latestParams = useRef(searchParams);
  useEffect(() => {
    latestParams.current = searchParams;
  });

  useEffect(() => {
    // Only act when the text differs from what the address already says. Without
    // this, simply opening the list (say on page 4, or after going back to it) ran
    // the update anyway and sent you to page 1 a moment later.
    if (value === (latestParams.current.get("search") ?? "")) return;

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(latestParams.current);
      if (value) params.set("search", value);
      else params.delete("search");
      params.delete("page"); // a new search starts from the first page
      const query = params.toString();
      router.replace(query ? `/students?${query}` : "/students");
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, router]);

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search by name or serial number…"
      className="max-w-xs"
      aria-label="Search students"
    />
  );
}
