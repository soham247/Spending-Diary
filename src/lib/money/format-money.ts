const DEFAULT_CURRENCY = "INR";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  let fmt = formatters.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, fmt);
  }
  return fmt;
}

/**
 * Formats an integer in minor units (paise) to a display string.
 * Example: formatMoney(12050) → "₹120.50"
 */
export function formatMoney(
  paise: number | bigint,
  currency = DEFAULT_CURRENCY,
): string {
  const major = Number(paise) / 100;
  return getFormatter(currency).format(major);
}
