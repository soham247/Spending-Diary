export const SUPPORTED_CURRENCIES = ["INR"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "INR";
