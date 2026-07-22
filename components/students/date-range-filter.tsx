"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Field } from "@/components/ui/input";

export function DateRangeFilter({
  studentId,
  initialStartDate = "",
  initialEndDate = "",
}: {
  studentId: string;
  initialStartDate?: string;
  initialEndDate?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  function handleApply() {
    const params = new URLSearchParams(searchParams);
    if (startDate) {
      params.set("startDate", startDate);
    } else {
      params.delete("startDate");
    }
    if (endDate) {
      params.set("endDate", endDate);
    } else {
      params.delete("endDate");
    }
    router.replace(`/students/${studentId}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  function handleClear() {
    setStartDate("");
    setEndDate("");
    const params = new URLSearchParams(searchParams);
    params.delete("startDate");
    params.delete("endDate");
    router.replace(`/students/${studentId}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const hasFilter = !!(initialStartDate || initialEndDate);

  let buttonText = "Filter by date";
  if (initialStartDate && initialEndDate) {
    buttonText = `${new Date(initialStartDate).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} - ${new Date(initialEndDate).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}`;
  } else if (initialStartDate) {
    buttonText = `From ${new Date(initialStartDate).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}`;
  } else if (initialEndDate) {
    buttonText = `To ${new Date(initialEndDate).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}`;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant={hasFilter ? "primary" : "secondary"} onClick={() => setOpen(true)} className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
          </svg>
          <span>{buttonText}</span>
        </Button>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Filter Scores by Date">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Field label="Start Date" htmlFor="startDate">
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End Date" htmlFor="endDate">
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleApply} className="w-full">
              Apply Filter
            </Button>
            <Button variant="secondary" onClick={handleClear} className="w-full">
              Clear Filter
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
