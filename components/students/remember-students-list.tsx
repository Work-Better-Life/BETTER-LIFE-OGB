"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { rememberStudentsList } from "@/lib/students-list-memory";

// Rendered on the students list. Whenever its address changes (another page, a
// search, a new sort or cohort filter) it's remembered for this tab, so "Students"
// links elsewhere can return to exactly this view.
export function RememberStudentsList() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    rememberStudentsList(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
