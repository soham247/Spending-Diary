import { format, parseISO } from "date-fns";

export function monthLabel(month: string) {
  return format(parseISO(month + "-01"), "MMMM ’yy");
}

export function nextMonthStart(month: string) {
  const [year, index] = month.split("-").map(Number);
  return index === 12
    ? `${year! + 1}-01-01`
    : `${year}-${String(index! + 1).padStart(2, "0")}-01`;
}
