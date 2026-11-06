import { responseData } from "./client";
import type { CreateInviteInput } from "@/lib/validation/invite";
import type { previewInvite } from "@/lib/domain/invites";
export type InvitePreview = Awaited<ReturnType<typeof previewInvite>>;
export const apiCreateInvite = ({ input, key }: { input: CreateInviteInput; key: string }) => fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(input) }).then(responseData<{ id: string; token: string }>);
export const apiPreviewInvite = (token: string) => fetch("/api/invites/preview?token=" + encodeURIComponent(token)).then(responseData<InvitePreview>);
export const apiClaimInvite = (token: string) => fetch("/api/invites/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(responseData<{ destination: string }>);
export const apiRevokeInvite = (id: string) => fetch("/api/invites/" + encodeURIComponent(id), { method: "DELETE" }).then(responseData<{ id: string }>);
export const apiReportInviteClaim = ({ id, key }: { id: string; key: string }) => fetch("/api/invites/"+encodeURIComponent(id)+"/report",{ method: "POST", headers: { "Content-Type": "application/json","Idempotency-Key": key },body: "{}" }).then(responseData<{ id: string }>);
