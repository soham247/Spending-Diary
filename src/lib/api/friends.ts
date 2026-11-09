import { responseData } from "./client";
import type { JsonValue } from "./types";
import type { listFriendRequests } from "@/lib/db/queries/people";
import type {
  CreateFriendRequestInput,
  PersonSearchResult,
  RespondFriendRequestInput,
} from "@/lib/validation/people";
import type { listFriends, getFriend } from "@/lib/db/queries/friends";
import type {
  PlaceholderInput,
  FriendUpdateInput,
} from "@/lib/validation/invite";
export type FriendList = JsonValue<Awaited<ReturnType<typeof listFriends>>>;
export type FriendDetail = JsonValue<Awaited<ReturnType<typeof getFriend>>>;
export type FriendRequestList = JsonValue<
  Awaited<ReturnType<typeof listFriendRequests>>
>;
export const apiSearchPeople = (query: string, signal: AbortSignal) =>
  fetch("/api/people/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  }).then(responseData<PersonSearchResult[]>);
export const apiListFriendRequests = (cursor?: string) =>
  fetch(
    "/api/friends/requests" +
      (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
  ).then(responseData<FriendRequestList>);
export const apiSendFriendRequest = ({
  input,
  key,
}: {
  input: CreateFriendRequestInput;
  key: string;
}) =>
  fetch("/api/friends/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiRespondFriendRequest = ({
  id,
  input,
}: {
  id: string;
  input: RespondFriendRequestInput;
}) =>
  fetch("/api/friends/requests/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiListFriends = () =>
  fetch("/api/friends").then(responseData<FriendList>);
export const apiGetFriend = (id: string) =>
  fetch("/api/friends/" + encodeURIComponent(id)).then(
    responseData<FriendDetail>,
  );
export const apiCreatePlaceholder = ({
  input,
  key,
}: {
  input: PlaceholderInput;
  key: string;
}) =>
  fetch("/api/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiUpdateFriend = ({
  id,
  input,
}: {
  id: string;
  input: FriendUpdateInput;
}) =>
  fetch("/api/friends/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
