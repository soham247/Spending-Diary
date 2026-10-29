import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency";

export const minorAmount = z.number().int().positive().max(2147483647);
export const nonnegativeAmount = z.number().int().min(0).max(2147483647);
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);
export const calendarDate = z.iso.date();
export const entityId = z.string().min(1).max(128);
