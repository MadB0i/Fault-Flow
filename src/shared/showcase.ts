/** Presentation timing only. All geography and earthquake records come from existing data. */
import { CATALOGUE_END_YEAR } from './catalogue.js';

export const SHOWCASE_STAGES = [
  { id: 'overview', start: 0 },
  { id: 'river', start: 1200 },
  { id: 'water', start: 2400 },
  { id: 'compare', start: 5000 },
  { id: 'transition', start: 7400 },
  { id: 'history', start: 8000 },
  { id: 'finish', start: 13000 },
] as const;
export const SHOWCASE_DURATION = 13000;
export type ShowcaseStage = (typeof SHOWCASE_STAGES)[number]['id'];

export function showcaseFrame(milliseconds: number) {
  const elapsed = Number.isFinite(milliseconds)
    ? Math.max(0, Math.min(SHOWCASE_DURATION, milliseconds))
    : 0;
  let index = 0;
  SHOWCASE_STAGES.forEach((stage, i) => {
    if (elapsed >= stage.start) index = i;
  });
  const stage = SHOWCASE_STAGES[index]!;
  const end = SHOWCASE_STAGES[index + 1]?.start ?? SHOWCASE_DURATION;
  const progress =
    stage.id === 'finish' ? 1 : (elapsed - stage.start) / (end - stage.start);
  return {
    stage: stage.id,
    index,
    progress,
    comparison: 0.95 - 0.9 * (1 - (1 - progress) ** 3),
    year: Math.min(
      CATALOGUE_END_YEAR,
      1900 + Math.floor(progress * (CATALOGUE_END_YEAR - 1900 + 1)),
    ),
  };
}

/** Select only a supplied historical record, including sparse early catalogue years. */
export function showcaseRecord<T extends { id: string; time: string; magnitude: number }>(
  records: readonly T[],
  year: number,
): T | null {
  let selected: T | null = null;
  for (const record of records) {
    if (Number(record.time.slice(0, 4)) > year) continue;
    if (
      !selected ||
      record.time.slice(0, 4) > selected.time.slice(0, 4) ||
      (record.time.slice(0, 4) === selected.time.slice(0, 4) &&
        record.magnitude > selected.magnitude)
    )
      selected = record;
  }
  return selected;
}
