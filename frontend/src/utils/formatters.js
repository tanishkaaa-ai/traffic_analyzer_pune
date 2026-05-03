const FALLBACK_MODEL_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatHourMinute = (hour, minute = 0) => {
  const referenceDate = new Date(2026, 0, 1, hour, minute, 0, 0);
  const hasMinutes = minute !== 0;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    ...(hasMinutes ? { minute: "2-digit" } : {})
  }).format(referenceDate);
};

export const formatMinutesAhead = (totalMinutes) => {
  const minutes = Math.max(0, Math.round(totalMinutes));

  if (minutes === 0) {
    return "Now";
  }

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts = [];

  if (days > 0) {
    parts.push(days === 1 ? "1 day" : `${days} days`);
  }

  if (hours > 0) {
    parts.push(hours === 1 ? "1 hour" : `${hours} hrs`);
  }

  if (remainingMinutes > 0) {
    parts.push(remainingMinutes === 1 ? "1 min" : `${remainingMinutes} mins`);
  }

  return parts.join(" ");
};

export const formatDuration = (seconds) => `${Math.round(seconds / 60)} min`;

export const formatDistance = (meters) => `${(meters / 1000).toFixed(1)} km`;

export const formatConfidence = (score) => `${Math.round(score * 100)}%`;

export const formatSelectedTime = (value) => {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return value || "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};

export const formatModelContext = (predictionContext) => {
  if (!predictionContext) {
    return "Not available";
  }

  const parsed = parseDateValue(predictionContext.future_time);
  if (parsed) {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "long"
    }).format(parsed);
    const timeLabel = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      ...(parsed.getMinutes() !== 0 ? { minute: "2-digit" } : {})
    }).format(parsed);

    return `${weekday}, ${timeLabel}`;
  }

  const dayName =
    Number.isInteger(predictionContext.future_day) &&
    predictionContext.future_day >= 0 &&
    predictionContext.future_day < FALLBACK_MODEL_DAY_NAMES.length
      ? FALLBACK_MODEL_DAY_NAMES[predictionContext.future_day]
      : null;

  const hasValidHour = Number.isInteger(predictionContext.future_hour);
  const hasValidMinute = Number.isInteger(predictionContext.future_minute);
  const timeLabel = hasValidHour
    ? formatHourMinute(
        predictionContext.future_hour,
        hasValidMinute ? predictionContext.future_minute : 0
      )
    : null;

  if (dayName && timeLabel) {
    return `${dayName}, ${timeLabel}`;
  }

  return "Not available";
};
