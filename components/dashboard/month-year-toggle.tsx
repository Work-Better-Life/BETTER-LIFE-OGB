"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import { getMonthOptions, getYearOptions, parseMonthValue, buildMonthValue, monthValueLabel } from "@/lib/stat-window";

// Helper component for dropdown
function DropdownSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-muted",
          isOpen && "bg-surface-muted"
        )}
        aria-label={label}
      >
        {selectedLabel}
        <svg
          className={cn(
            "h-3 w-3 text-foreground-muted transition-transform",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-md border border-border bg-surface p-1 shadow-lg">
          <div className="flex flex-col gap-0.5">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "rounded-[5px] px-2 py-1.5 text-left text-[13px] font-medium transition-colors",
                  value === option.value
                    ? "bg-surface-muted text-foreground"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthYearToggle({
  paramName,
  value,
  label,
}: {
  paramName: string;
  value: string;
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { year, month } = parseMonthValue(value);
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  function handleSelectMonth(nextMonth: string) {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, buildMonthValue(year, nextMonth));
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  function handleSelectYear(nextYear: string) {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, buildMonthValue(nextYear, month));
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Month dropdown */}
      <DropdownSelect
        value={month}
        options={monthOptions}
        onChange={handleSelectMonth}
        label={`${label} - Month`}
      />
      
      {/* Year dropdown */}
      <DropdownSelect
        value={year}
        options={yearOptions}
        onChange={handleSelectYear}
        label={`${label} - Year`}
      />
    </div>
  );
}
