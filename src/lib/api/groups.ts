import { responseData } from "./client";
import type { JsonValue } from "./types";
import type { listGroups, getGroup } from "@/lib/db/queries/groups";
import type {
  CreateGroupInput,
  UpdateGroupInput,
  MemberActionInput,
} from "@/lib/validation/group";
export type GroupList = JsonValue<Awaited<ReturnType<typeof listGroups>>>;
export type GroupDetail = JsonValue<Awaited<ReturnType<typeof getGroup>>>;
export const apiListGroups = () =>
  fetch("/api/groups").then(responseData<GroupList>);
export const apiGetGroup = (id: string) =>
  fetch("/api/groups/" + encodeURIComponent(id)).then(
    responseData<GroupDetail>,
  );
export const apiCreateGroup = ({
  input,
  key,
}: {
  input: CreateGroupInput;
  key: string;
}) =>
  fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiUpdateGroup = ({
  id,
  input,
}: {
  id: string;
  input: UpdateGroupInput;
}) =>
  fetch("/api/groups/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiChangeMember = ({
  id,
  input,
}: {
  id: string;
  input: MemberActionInput;
}) =>
  fetch("/api/groups/" + encodeURIComponent(id) + "/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
