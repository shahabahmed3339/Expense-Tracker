import { VALIDATION_MESSAGES } from "@/lib/config/runtime";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function parseMonthParts(month: string) {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(VALIDATION_MESSAGES.invalidMonthFormat);
  }

  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) {
    throw new Error(VALIDATION_MESSAGES.invalidMonthFormat);
  }

  return { year, monthIndex };
}

export function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(month: string) {
  const { year, monthIndex } = parseMonthParts(month);
  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1)),
    end: new Date(Date.UTC(year, monthIndex, 1)),
  };
}

export function monthValueToDate(month: string) {
  parseMonthParts(month);
  return `${month}-01`;
}
