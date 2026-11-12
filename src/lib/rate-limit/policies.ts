export interface RateLimitPolicy {
  name: string;
  window: number;
  max: number;
  refresh: boolean;
}

export const peoplePolicies = {
  search: { name: "people-search", window: 60, max: 30, refresh: false },
  request: { name: "people-request", window: 60, max: 10, refresh: false },
} satisfies Record<string, RateLimitPolicy>;

export type EmailPurpose = "verification" | "password-reset";
