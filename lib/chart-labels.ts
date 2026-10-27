// Which x-axis labels to draw on a chart with `length` points when only about
// `maxLabels` fit: the first, the last, and every `step`-th point between them.
//
// The last point is always labelled, so a regular label that falls within one
// step of it is dropped — otherwise the two print on top of each other whenever
// the last point isn't an exact multiple of the step (e.g. "Oct 21" over "Oct 22").
export function labelStepFor(length: number, maxLabels: number) {
  return Math.max(1, Math.ceil(length / maxLabels));
}

export function shouldShowLabel(index: number, length: number, step: number) {
  const last = length - 1;
  if (index === 0 || index === last) return true;
  return index % step === 0 && last - index >= step;
}
