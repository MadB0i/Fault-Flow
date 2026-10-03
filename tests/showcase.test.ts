import { describe, expect, it } from 'vitest';
import catalogue from '../src/data/earthquakes.json';
import { CATALOGUE_END_YEAR } from '../src/shared/catalogue.js';
import {
  showcaseFrame,
  showcaseRecord,
  SHOWCASE_STAGES,
  SHOWCASE_DURATION,
} from '../src/shared/showcase.js';

describe('optional showcase timing and recorded history', () => {
  it('bounds invalid clocks and finishes inside the requested presentation window', () => {
    expect(showcaseFrame(Number.NaN).stage).toBe('overview');
    expect(showcaseFrame(-200).progress).toBe(0);
    expect(showcaseFrame(1e6).stage).toBe('finish');
    expect(SHOWCASE_DURATION).toBeGreaterThanOrEqual(8000);
    expect(SHOWCASE_DURATION).toBeLessThanOrEqual(15000);
    for (const stage of SHOWCASE_STAGES)
      expect(showcaseFrame(stage.start).stage).toBe(stage.id);
  });
  it('sweeps one comparison state without reversing or going out of range', () => {
    const positions = [5000, 5400, 5800, 6200, 6600, 7000, 7399].map(
      (t) => showcaseFrame(t).comparison,
    );
    expect(positions[0]).toBeCloseTo(0.95);
    expect(positions.at(-1)).toBeCloseTo(0.05);
    positions.forEach((value, i) => {
      expect(value).toBeGreaterThanOrEqual(0.05);
      if (i) expect(value).toBeLessThanOrEqual(positions[i - 1]!);
    });
  });
  it('advances only through the bundled catalogue, including an empty early record', () => {
    expect(showcaseRecord(catalogue.events, 1900)).toBeNull();
    for (let t = 8000; t < SHOWCASE_DURATION; t += 80) {
      const year = showcaseFrame(t).year;
      expect(year).toBeLessThanOrEqual(CATALOGUE_END_YEAR);
      const event = showcaseRecord(catalogue.events, year);
      if (event) {
        expect(catalogue.events).toContain(event);
        expect(Number(event.time.slice(0, 4))).toBeLessThanOrEqual(year);
      }
    }
    const historic = catalogue.events.find((event) =>
      event.time.startsWith('1950-08-15'),
    )!;
    expect(showcaseRecord(catalogue.events, 1950)).toBe(historic);
    expect(showcaseRecord([], 2020)).toBeNull();
  });
});
