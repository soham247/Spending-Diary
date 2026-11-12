import "server-only";
import { defineRequestState, hasRequestState } from "@better-auth/core/context";
import { APIError } from "better-auth/api";
import { reserveEmail } from "./consume";
import type { EmailPurpose } from "./policies";
import { RateLimitUnavailableError } from "@/lib/utils/errors";

const reservations = defineRequestState(() => new Map<string, boolean>());
const reservationKey = (email: string, purpose: EmailPurpose) =>
  purpose + ":" + email.trim().toLowerCase();

export async function preflightEmail(email: string, purpose: EmailPurpose) {
  try {
    const allowed = await reserveEmail(email, purpose);
    (await reservations.get()).set(reservationKey(email, purpose), allowed);
  } catch {
    const error = new RateLimitUnavailableError();
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: error.code,
      message: error.message,
    });
  }
}

export async function maySendEmail(
  email: string,
  purpose: EmailPurpose,
): Promise<boolean> {
  if (await hasRequestState()) {
    const state = await reservations.get();
    const key = reservationKey(email, purpose);
    if (state.has(key)) {
      const allowed = state.get(key) === true;
      state.set(key, false);
      return allowed;
    }
  }
  try {
    return await reserveEmail(email, purpose);
  } catch {
    const error = new RateLimitUnavailableError();
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: error.code,
      message: error.message,
    });
  }
}
