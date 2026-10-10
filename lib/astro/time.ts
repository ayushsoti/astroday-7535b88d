/** Timezone-aware local civil time -> UTC, plus day-number helpers. */

/** Convert a local civil date/time in an IANA zone to a UTC Date. */
export function zonedToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  // Determine the zone offset at the guess, then correct once (handles DST edges).
  const offset1 = zoneOffsetMinutes(new Date(utcGuess), timezone);
  const corrected = utcGuess - offset1 * 60000;
  const offset2 = zoneOffsetMinutes(new Date(corrected), timezone);
  if (offset2 !== offset1) return new Date(utcGuess - offset2 * 60000);
  return new Date(corrected);
}

/** Offset in minutes to add to UTC to get local time in `timezone`. */
export function zoneOffsetMinutes(date: Date, timezone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

const DAY_MS = 86400000;

/** Days since 1970-01-01 for a YYYY-MM-DD civil date. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
