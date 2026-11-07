/**
 * Converts a user-typed amount string (e.g. "120.50") to minor units
 * (paise). Returns an integer. Throws on invalid input, negative values,
 * or more than 2 decimal places.
 */
export function toMinor(input: string): number {
  const grouped = input.trim();
  if (
    grouped.includes(",") &&
    !/^-?(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(
      grouped,
    )
  )
    throw new Error("Invalid amount format. Check comma grouping");
  const trimmed = grouped.replaceAll(",", "");
  if (trimmed === "" || trimmed === "-") {
    throw new Error("Amount is required");
  }

  // Only digits, optional decimal point, optional leading minus
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(
      "Invalid amount format. Use up to 2 decimal places (e.g. 120.50)",
    );
  }

  const [whole = "0", frac = ""] = trimmed.replace(/^-/, "").split(".");
  const isNegative = trimmed.startsWith("-");
  const paise = parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, "0"), 10);

  if (paise === 0 && !isNegative) return 0;
  if (isNegative) {
    throw new Error("Amount must not be negative");
  }

  if (!Number.isSafeInteger(paise)) {
    throw new Error("Amount is too large");
  }

  return paise;
}
