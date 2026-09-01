"use client";

import { useEffect, useMemo, useState } from "react";
import { parseLogContent } from "@/lib/log-content";
import {
  buildCalendarWeeks,
  chicagoParts,
  formatChicagoTime,
  formatDayHeading,
  MEAL_BUCKETS,
  mondayIndex,
  monthShort,
  monthYearLabel,
  sameCivilDate,
  WEEKDAY_LABELS,
  type CalendarPost,
  type CivilDate,
  type DayMeals,
  type MealBucket,
} from "@/lib/calendar";

type LogRecord = { id: string; createdAt: string; context: string };

type OpenBucket = {
  day: DayMeals<LogRecord>;
  meal: MealBucket;
};

const MEAL_LABEL: Record<MealBucket, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  other: "Other",
};

export function CalendarView({ logs }: { logs: LogRecord[] }) {
  const [now] = useState(() => new Date());
  const [open, setOpen] = useState<OpenBucket | null>(null);
  const weeks = useMemo(() => buildCalendarWeeks(logs, now), [logs, now]);
  const today = chicagoParts(now);
  const posts = open ? open.day[open.meal] : [];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function jumpToToday() {
    document.getElementById("calendar-today")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <section className="calendar-shell">
      <div className="intro">
        <p className="eyebrow">AMERICA/CHICAGO</p>
        <h1>Calendar</h1>
        <p>Existing posts by Chicago day. Lunch is 11:00am–3:00pm, dinner is 5:00pm–11:00pm; anything else is unlabeled.</p>
        <button type="button" className="today-jump" onClick={jumpToToday}>Jump to today</button>
      </div>
      <div className="calendar">
        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
        </div>
        {weeks.map((week) => (
          <div className="calendar-week" key={week.days[0]?.key}>
            {week.days.map((day) => (
              <DayCell
                key={day.key}
                day={day}
                today={today}
                selected={open && open.day.key === day.key ? open.meal : null}
                onOpen={(meal) => setOpen({ day, meal })}
              />
            ))}
          </div>
        ))}
      </div>
      {open ? (
        <div className="calendar-overlay" onClick={() => setOpen(null)}>
          <div
            className="calendar-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-panel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendar-panel-head">
              <div>
                <p className="eyebrow">{MEAL_LABEL[open.meal]}</p>
                <h2 id="calendar-panel-title">{formatDayHeading(open.day.date)}</h2>
              </div>
              <button type="button" className="panel-close" onClick={() => setOpen(null)} aria-label="Close">Close</button>
            </div>
            {posts.length === 0 ? (
              <div className="empty">No {MEAL_LABEL[open.meal].toLowerCase()} posts this day.</div>
            ) : posts.map((post) => <CalendarEntry key={post.id} post={post} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DayCell({
  day,
  today,
  selected,
  onOpen,
}: {
  day: DayMeals<LogRecord>;
  today: CivilDate;
  selected: MealBucket | null;
  onOpen: (meal: MealBucket) => void;
}) {
  const isToday = sameCivilDate(day.date, today);
  const isMonday = mondayIndex(day.date) === 0;
  const isMonthStart = day.date.day === 1;
  const monthParity = day.date.month % 2 === 0 ? "even" : "odd";

  return (
    <article
      className={`calendar-day month-${monthParity}${isToday ? " is-today" : ""}`}
      id={isToday ? "calendar-today" : undefined}
      aria-current={isToday ? "date" : undefined}
    >
      <header className="day-head">
        {isMonthStart ? <span className="day-month">{monthYearLabel(day.date)}</span> : null}
        <span className="day-number">
          {isMonday || isMonthStart ? `${monthShort(day.date)} ` : ""}
          {day.date.day}
        </span>
      </header>
      <div className="meal-row">
        {MEAL_BUCKETS.map((meal) => {
          const count = day[meal].length;
          if (count === 0) return <span key={meal} className={`meal-slot empty ${meal}`} aria-hidden="true" />;
          return (
            <button
              key={meal}
              type="button"
              className={`meal-chip ${meal}${selected === meal ? " active" : ""}`}
              onClick={() => onOpen(meal)}
              aria-label={`${MEAL_LABEL[meal]} · ${count} ${count === 1 ? "post" : "posts"} · ${formatDayHeading(day.date)}`}
            >
              <span className="meal-name"><span className="meal-full">{MEAL_LABEL[meal]}</span><span className="meal-short">{meal === "lunch" ? "L" : meal === "dinner" ? "D" : "O"}</span></span>
              <span className="meal-count">{count}</span>
            </button>
          );
        })}
      </div>
      <ul className="day-posts">
        {MEAL_BUCKETS.flatMap((meal) => day[meal].map((post) => (
          <li key={post.id}>
            <button type="button" className={`post-preview ${meal}`} onClick={() => onOpen(meal)}>
              <span className="preview-time">{formatChicagoTime(post.createdAt)}</span>
              <span className="preview-text">{previewText(post)}</span>
            </button>
          </li>
        )))}
      </ul>
    </article>
  );
}

function CalendarEntry({ post }: { post: CalendarPost<LogRecord> }) {
  return (
    <article className="entry calendar-entry">
      <time dateTime={post.createdAt}>{formatChicagoTime(post.createdAt)}</time>
      <div className="entry-body">
        {parseLogContent(post.context).map((part, index) =>
          part.type === "text" ? <p key={index}>{part.value}</p> : <img key={index} src={part.url} alt={part.alt} />,
        )}
      </div>
    </article>
  );
}

function previewText(post: LogRecord): string {
  const parts = parseLogContent(post.context);
  const text = parts.find((part) => part.type === "text" && part.value.trim());
  if (text && text.type === "text") {
    const line = text.value.trim().split("\n").find((value) => value.trim());
    if (line) return line.length > 72 ? `${line.slice(0, 69).trimEnd()}…` : line;
  }
  return parts.some((part) => part.type === "image") ? "Photo" : "Entry";
}
