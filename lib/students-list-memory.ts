"use client";

import { useSyncExternalStore } from "react";

// Remembers where you were on the students list — page, search, sort and cohort
// filter — for this browser tab, so every "Students" link on the pages you open
// from it (a student, their profile, the edit form…) can bring you back to the
// same spot instead of page 1.

const KEY = "studentsListUrl";
const CHANGED = "students-list-url-changed";
const DEFAULT_HREF = "/students";

// Only the list's own address is ever accepted: "/students" or "/students?…".
// Anything else (a different page, a lookalike like "/studentsfoo", garbage)
// falls back to the plain list.
export function normalizeStudentsListHref(value: string | null | undefined): string {
  if (!value || !value.startsWith("/students")) return DEFAULT_HREF;
  const rest = value.slice("/students".length);
  if (rest !== "" && !rest.startsWith("?")) return DEFAULT_HREF;
  return value;
}

export function rememberStudentsList(href: string) {
  try {
    sessionStorage.setItem(KEY, normalizeStudentsListHref(href));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Storage unavailable (private mode, blocked): links just go to the plain list.
  }
}

function read() {
  try {
    return normalizeStudentsListHref(sessionStorage.getItem(KEY));
  } catch {
    return DEFAULT_HREF;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The address a "Students" link should point at. The server render and the first
// client render use the plain list (so they match); right after, it switches to
// the remembered one.
export function useStudentsListHref() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_HREF);
}
