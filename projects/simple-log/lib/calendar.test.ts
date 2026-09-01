import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotatePost,
  buildCalendarWeeks,
  chicagoParts,
  civilKey,
  mealBucket,
  mealBucketForInstant,
  mondayIndex,
  startOfWeekMonday,
  WEEKDAY_LABELS,
} from "./calendar.ts";

function fromChicago(year: number, month: number, day: number, hour: number, minute: number): Date {
  for (const offsetHours of [5, 6]) {
    const instant = new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute, 0));
    const parts = chicagoParts(instant);
    if (parts.year === year && parts.month === month && parts.day === day && parts.hour === hour && parts.minute === minute) {
      return instant;
    }
  }
  throw new Error(`Could not map Chicago ${year}-${month}-${day} ${hour}:${minute}`);
}

describe("Chicago calendar days", () => {
  it("places a late-evening UTC instant on the previous Chicago day", () => {
    const instant = "2026-08-13T03:45:21.936Z";
    const parts = chicagoParts(instant);
    assert.deepEqual({ year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute }, {
      year: 2026,
      month: 8,
      day: 12,
      hour: 22,
      minute: 45,
    });
    assert.equal(mealBucketForInstant(instant), "dinner");
  });

  it("uses Chicago civil dates across the 2026 spring-forward", () => {
    const lunch = fromChicago(2026, 3, 8, 12, 0);
    const parts = chicagoParts(lunch);
    assert.equal(civilKey(parts), "2026-03-08");
    assert.equal(parts.hour, 12);
    assert.equal(mealBucketForInstant(lunch), "lunch");
  });

  it("keeps a mid-afternoon UTC instant on the same Chicago calendar day", () => {
    const instant = "2026-09-01T17:55:48.950Z";
    const parts = chicagoParts(instant);
    assert.equal(civilKey(parts), "2026-09-01");
    assert.equal(parts.hour, 12);
    assert.equal(parts.minute, 55);
    assert.equal(mealBucketForInstant(instant), "lunch");
  });
});

describe("meal buckets in Chicago local time", () => {
  it("labels lunch from 11:00am through 3:00pm inclusive", () => {
    assert.equal(mealBucket(10, 59), "other");
    assert.equal(mealBucket(11, 0), "lunch");
    assert.equal(mealBucket(12, 55), "lunch");
    assert.equal(mealBucket(15, 0), "lunch");
    assert.equal(mealBucket(15, 1), "other");
    assert.equal(mealBucketForInstant(fromChicago(2026, 8, 18, 11, 0)), "lunch");
    assert.equal(mealBucketForInstant(fromChicago(2026, 8, 18, 15, 0)), "lunch");
  });

  it("labels dinner from 5:00pm through 11:00pm inclusive", () => {
    assert.equal(mealBucket(16, 59), "other");
    assert.equal(mealBucket(17, 0), "dinner");
    assert.equal(mealBucket(22, 45), "dinner");
    assert.equal(mealBucket(23, 0), "dinner");
    assert.equal(mealBucket(23, 1), "other");
    assert.equal(mealBucketForInstant(fromChicago(2026, 8, 21, 17, 0)), "dinner");
    assert.equal(mealBucketForInstant(fromChicago(2026, 8, 21, 23, 0)), "dinner");
  });

  it("leaves other times unlabeled", () => {
    assert.equal(mealBucket(0, 34), "other");
    assert.equal(mealBucket(9, 4), "other");
    assert.equal(mealBucket(15, 50), "other");
    assert.equal(mealBucket(23, 3), "other");
    assert.equal(mealBucket(23, 50), "other");
  });
});

describe("week grid", () => {
  it("starts weeks on Monday and continues across a month boundary", () => {
    assert.equal(WEEKDAY_LABELS[mondayIndex({ year: 2026, month: 8, day: 31 })], "Mon");
    assert.deepEqual(startOfWeekMonday({ year: 2026, month: 9, day: 1 }), { year: 2026, month: 8, day: 31 });

    const posts = [
      { id: "aug", createdAt: fromChicago(2026, 8, 31, 12, 24).toISOString() },
      { id: "sep", createdAt: fromChicago(2026, 9, 1, 12, 55).toISOString() },
    ];
    const weeks = buildCalendarWeeks(posts, fromChicago(2026, 9, 1, 12, 0));
    const spanning = weeks.find((week) => week.days.some((day) => day.key === "2026-08-31") && week.days.some((day) => day.key === "2026-09-01"));
    assert.ok(spanning);
    assert.equal(spanning.days.length, 7);
    assert.equal(spanning.days[0]?.key, "2026-08-31");
    assert.equal(spanning.days[1]?.key, "2026-09-01");
    assert.equal(spanning.days[0]?.lunch[0]?.id, "aug");
    assert.equal(spanning.days[1]?.lunch[0]?.id, "sep");
  });

  it("groups a day's posts into lunch, dinner, and other", () => {
    const posts = [
      { id: "other-morning", createdAt: fromChicago(2026, 8, 18, 9, 4).toISOString() },
      { id: "lunch", createdAt: fromChicago(2026, 8, 18, 12, 50).toISOString() },
      { id: "dinner", createdAt: fromChicago(2026, 8, 18, 20, 58).toISOString() },
    ];
    const day = annotatePost(posts[1]!);
    assert.equal(day.meal, "lunch");
    const weeks = buildCalendarWeeks(posts, fromChicago(2026, 8, 18, 12, 0));
    const august18 = weeks.flatMap((week) => week.days).find((day) => day.key === "2026-08-18");
    assert.deepEqual(august18?.lunch.map((post) => post.id), ["lunch"]);
    assert.deepEqual(august18?.dinner.map((post) => post.id), ["dinner"]);
    assert.deepEqual(august18?.other.map((post) => post.id), ["other-morning"]);
  });
});
