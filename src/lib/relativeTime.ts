export function formatFeedDate(iso: string, unix: number): string {
  const parsed = Date.parse(iso) || unix * 1000;
  if (!parsed) {
    return "";
  }

  return dayBucketLabel(parsed);
}

/** Today / Yesterday / weekday / full date for timeline headers. */
export function dayBucketLabel(timestampMs: number): string {
  if (!timestampMs) {
    return "";
  }
  const now = new Date();
  const date = new Date(timestampMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfToday - startOfThat) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function dayBucketKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
