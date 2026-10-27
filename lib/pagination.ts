export type PageItem = number | "gap-left" | "gap-right";

// Which page buttons to draw: the first and last page, the current page with
// one neighbour either side, and "…" gaps for what's skipped. The number of
// items stays constant (7) as you move through the pages, so the control
// doesn't jump around; with 7 pages or fewer it just shows them all.
//
//   total 20, page 1  ->  1 2 3 4 5 … 20
//   total 20, page 10 ->  1 … 9 10 11 … 20
//   total 20, page 19 ->  1 … 16 17 18 19 20
export function pageItems(current: number, total: number): PageItem[] {
  const MAX_ITEMS = 7;
  if (total <= MAX_ITEMS) return Array.from({ length: total }, (_, i) => i + 1);

  const page = Math.min(Math.max(1, current), total);
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  if (page <= 4) return [...range(1, 5), "gap-right", total];
  if (page >= total - 3) return [1, "gap-left", ...range(total - 4, total)];
  return [1, "gap-left", page - 1, page, page + 1, "gap-right", total];
}
