import { responseData } from "./client";
import type { Profile, UpdateProfileInput } from "@/lib/validation/profile";

export const apiGetProfile = () => fetch("/api/me").then(responseData<Profile>);
export const apiUpdateProfile = (input: UpdateProfileInput) =>
  fetch("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<Profile>);
