import { z } from "zod";
import { entityId } from "./money";

export const peopleSearchSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .min(1, "Enter a name or full email address")
    .max(254),
});
export const friendRequestListSchema = z.strictObject({
  cursor: entityId.optional(),
});
export const createFriendRequestSchema = z
  .strictObject({
    userId: entityId.optional(),
    email: z.string().trim().max(254).toLowerCase().pipe(z.email()).optional(),
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .superRefine((input, ctx) => {
    if (input.token ? !!input.userId || !!input.email : !input.userId)
      ctx.addIssue({
        code: "custom",
        message: "Choose a person or a connection link",
      });
  });
export const respondFriendRequestSchema = z.strictObject({
  action: z.enum(["ACCEPT", "DECLINE"]),
});
export type CreateFriendRequestInput = z.infer<
  typeof createFriendRequestSchema
>;
export type RespondFriendRequestInput = z.infer<
  typeof respondFriendRequestSchema
>;

export type PersonSearchResult = {
  id: string;
  name: string;
  relationship: "FRIEND" | "NONE" | "INCOMING" | "OUTGOING";
  requestId: string | null;
  source: "CONTEXT" | "EMAIL";
};
