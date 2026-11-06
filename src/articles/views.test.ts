import { describe, expect, it } from 'vitest';
import {
  incrementDayViews,
  recentViewsWindowStart,
  sumViewsInWindow,
  utcDayString,
} from './views';

describe('article view days', () => {
  const now = new Date('2026-11-06T15:00:00.000Z');

  it('upserts a second view on the same UTC day into one bucket', () => {
    const first = incrementDayViews([], utcDayString(now));
    const second = incrementDayViews(first, utcDayString(now));

    expect(second).toEqual([{ day: '2026-11-06', views: 2 }]);
  });

  it('sums two days of the same article inside the 30-day window', () => {
    expect(
      sumViewsInWindow(
        [
          { day: '2026-11-06', views: 4 },
          { day: '2026-10-08', views: 3 },
        ],
        now,
      ),
    ).toBe(7);
  });

  it('drops the 31st day from the window', () => {
    expect(recentViewsWindowStart(now)).toBe('2026-10-08');
    expect(
      sumViewsInWindow(
        [
          { day: '2026-10-07', views: 50 },
          { day: '2026-10-08', views: 2 },
          { day: '2026-11-06', views: 1 },
        ],
        now,
      ),
    ).toBe(3);
  });
});
