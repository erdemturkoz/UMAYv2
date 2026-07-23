export const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const nowIso = (now = new Date()) => now.toISOString();

export const istanbulDateKey = (date = new Date()) => {
  const parts = dateKeyFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const formatIstanbulDateTime = (date: Date) => dateTimeFormatter.format(date);

export const parseStoredDate = (value?: string) => {
  if (!value || value === "—") return undefined;

  // Canonical timestamps always include a zone. Date-only values are business
  // dates and therefore start at midnight in Europe/Istanbul (UTC+03:00).
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00+03:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  // Legacy UI records used DD.MM.YYYY [HH:mm] without a zone. Interpret them
  // as Istanbul wall-clock values so old data does not shift with browser zone.
  const legacy = value.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/,
  );
  if (!legacy) return undefined;
  const [, day, month, year, hour = "0", minute = "0"] = legacy;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 3, Number(minute)),
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const shiftDateKey = (key: string, days: number) => {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

export const inIstanbulPeriod = (
  value: string | undefined,
  period: string,
  now = new Date(),
) => {
  if (period === "Tüm Tarihler") return true;
  const date = parseStoredDate(value);
  if (!date) return false;
  const key = istanbulDateKey(date);
  const today = istanbulDateKey(now);
  const [year, month, day] = today.split("-").map(Number);
  if (period === "Bugün") return key === today;
  if (period === "Bu Hafta") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const start = shiftDateKey(today, -((weekday + 6) % 7));
    return key >= start && key < shiftDateKey(start, 7);
  }
  if (period === "Bu Ay") {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    return key.startsWith(prefix);
  }
  if (period === "Geçen Ay") {
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const prefix = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}-`;
    return key.startsWith(prefix);
  }
  const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
  const start = `${year}-${String(quarterStart).padStart(2, "0")}-01`;
  const finishDate = new Date(Date.UTC(year, quarterStart - 1 + 3, 1));
  const finish = finishDate.toISOString().slice(0, 10);
  return key >= start && key < finish;
};
