export const CHICAGO_TIME_ZONE = "America/Chicago";

export type MealBucket = "lunch" | "dinner" | "other";
export type CivilDate = { year: number; month: number; day: number };
export type ChicagoParts = CivilDate & { hour: number; minute: number };
export type DatedPost<T> = T & { createdAt: string };

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const MEAL_BUCKETS: MealBucket[] = ["lunch", "dinner", "other"];

const chicagoPartFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CHICAGO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const chicagoWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CHICAGO_TIME_ZONE,
  weekday: "short",
});

export function chicagoParts(instant: Date | string): ChicagoParts {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = chicagoPartFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(value("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour,
    minute: Number(value("minute")),
  };
}

export function mealBucket(hour: number, minute: number): MealBucket {
  const minutes = hour * 60 + minute;
  if (minutes >= 11 * 60 && minutes <= 15 * 60) return "lunch";
  if (minutes >= 17 * 60 && minutes <= 23 * 60) return "dinner";
  return "other";
}

export function mealBucketForInstant(instant: Date | string): MealBucket {
  const parts = chicagoParts(instant);
  return mealBucket(parts.hour, parts.minute);
}

export function civilKey(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function sameCivilDate(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function compareCivilDate(a: CivilDate, b: CivilDate): number {
  return civilKey(a).localeCompare(civilKey(b));
}

/** Monday = 0 … Sunday = 6 for a Chicago civil date. */
export function mondayIndex(date: CivilDate): number {
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day, 18, 0, 0));
  const weekday = chicagoWeekdayFormatter.format(probe);
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  if (index < 0) throw new Error(`Unexpected weekday ${weekday}`);
  return index;
}

export function startOfWeekMonday(date: CivilDate): CivilDate {
  return addCivilDays(date, -mondayIndex(date));
}

export function endOfWeekSunday(date: CivilDate): CivilDate {
  return addCivilDays(startOfWeekMonday(date), 6);
}

export type CalendarPost<T extends { createdAt: string }> = T & {
  chicago: ChicagoParts;
  meal: MealBucket;
  dayKey: string;
};

export type DayMeals<T extends { createdAt: string }> = {
  date: CivilDate;
  key: string;
  lunch: CalendarPost<T>[];
  dinner: CalendarPost<T>[];
  other: CalendarPost<T>[];
};

export type CalendarWeek<T extends { createdAt: string }> = {
  start: CivilDate;
  days: DayMeals<T>[];
};

export function annotatePost<T extends { createdAt: string }>(post: T): CalendarPost<T> {
  const chicago = chicagoParts(post.createdAt);
  return {
    ...post,
    chicago,
    meal: mealBucket(chicago.hour, chicago.minute),
    dayKey: civilKey(chicago),
  };
}

export function emptyDay<T extends { createdAt: string }>(date: CivilDate): DayMeals<T> {
  return { date, key: civilKey(date), lunch: [], dinner: [], other: [] };
}

export function buildCalendarWeeks<T extends { createdAt: string }>(
  posts: T[],
  now: Date | string = new Date(),
): CalendarWeek<T>[] {
  const annotated = posts.map(annotatePost);
  const today = chicagoParts(now);
  let start = startOfWeekMonday(today);
  let end = endOfWeekSunday(today);

  for (const post of annotated) {
    const day = { year: post.chicago.year, month: post.chicago.month, day: post.chicago.day };
    if (compareCivilDate(day, start) < 0) start = startOfWeekMonday(day);
    if (compareCivilDate(day, end) > 0) end = endOfWeekSunday(day);
  }

  const byDay = new Map<string, DayMeals<T>>();
  for (let cursor = start; compareCivilDate(cursor, end) <= 0; cursor = addCivilDays(cursor, 1)) {
    byDay.set(civilKey(cursor), emptyDay(cursor));
  }

  const chronological = [...annotated].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const post of chronological) {
    const day = byDay.get(post.dayKey);
    if (!day) continue;
    day[post.meal].push(post);
  }

  const weeks: CalendarWeek<T>[] = [];
  for (let cursor = start; compareCivilDate(cursor, end) <= 0; cursor = addCivilDays(cursor, 7)) {
    const days: DayMeals<T>[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addCivilDays(cursor, offset);
      days.push(byDay.get(civilKey(date)) ?? emptyDay<T>(date));
    }
    weeks.push({ start: cursor, days });
  }
  return weeks;
}

export function monthLabel(date: CivilDate): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(date.year, date.month - 1, 1)),
  );
}

export function monthYearLabel(date: CivilDate): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(date.year, date.month - 1, 1)),
  );
}

export function monthShort(date: CivilDate): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(date.year, date.month - 1, 1)),
  );
}

export function formatChicagoTime(instant: Date | string): string {
  const { hour, minute } = chicagoParts(instant);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatDayHeading(date: CivilDate): string {
  const weekday = WEEKDAY_LABELS[mondayIndex(date)] ?? "Day";
  return `${weekday} ${monthLabel(date)} ${date.day}`;
}

const SINCE_LOCAL_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

const SINCE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type ChicagoSince = {
  /** Absolute instant for the Chicago wall time. Ambiguous fall-back times use the earlier instant. */
  instant: Date;
  /** Wall-clock label in America/Chicago, matching the input clock time. */
  label: string;
};

function isValidCivilDate(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function padMilliseconds(fraction: string | undefined): number {
  if (!fraction) return 0;
  return Number(fraction.padEnd(3, "0"));
}

function formatSinceLabel(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): string {
  const monthName = SINCE_MONTHS[month - 1] ?? "???";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minuteText = String(minute).padStart(2, "0");
  const fraction = millisecond === 0 ? "" : `.${String(millisecond).padStart(3, "0")}`;
  const clock = second === 0 && millisecond === 0
    ? `${hour12}:${minuteText} ${period}`
    : `${hour12}:${minuteText}:${String(second).padStart(2, "0")}${fraction} ${period}`;
  return `${monthName} ${day}, ${year}, ${clock}`;
}

/** URL query param for a Central Time (America/Chicago) "posts since" cutoff. */
export const SINCE_CT_PARAM = "sinceCT";

/**
 * Parse a `sinceCT` query value as an America/Chicago wall time with no zone suffix.
 * Missing or invalid values, including spring-forward gaps, return null.
 * During the fall-back hour the same clock time occurs twice; the earlier instant (daylight-saving side) is used.
 */
export function parseChicagoSince(value: string | null | undefined): ChicagoSince | null {
  if (typeof value !== "string") return null;
  const match = SINCE_LOCAL_DATETIME.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const millisecond = padMilliseconds(match[7]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || !isValidCivilDate(year, month, day)) return null;

  // UTC-5 is earlier than UTC-6 for the same wall clock, so the first match is the conservative fall-back instant.
  for (const offsetHours of [5, 6]) {
    const instant = new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute, second, millisecond));
    const parts = chicagoParts(instant);
    if (parts.year === year && parts.month === month && parts.day === day && parts.hour === hour && parts.minute === minute) {
      return { instant, label: formatSinceLabel(year, month, day, hour, minute, second, millisecond) };
    }
  }
  return null;
}
