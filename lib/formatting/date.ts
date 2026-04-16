const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatShortDate(value: string | Date) {
  return shortDateFormatter.format(new Date(value));
}
