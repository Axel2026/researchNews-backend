export const RECENT_VIEW_DAYS = 30;

export function utcDayString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function recentViewsWindowStart(now: Date): string {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (RECENT_VIEW_DAYS - 1),
    ),
  );

  return utcDayString(start);
}

export function incrementDayViews(
  rows: { day: string; views: number }[],
  day: string,
): { day: string; views: number }[] {
  const existing = rows.find((row) => row.day === day);

  if (!existing) {
    return [...rows, { day, views: 1 }];
  }

  return rows.map((row) =>
    row.day === day ? { ...row, views: row.views + 1 } : row,
  );
}

export function sumViewsInWindow(
  rows: { day: string; views: number }[],
  now: Date,
): number {
  const start = recentViewsWindowStart(now);
  const end = utcDayString(now);

  return rows.reduce((total, row) => {
    if (row.day >= start && row.day <= end) {
      return total + row.views;
    }

    return total;
  }, 0);
}
