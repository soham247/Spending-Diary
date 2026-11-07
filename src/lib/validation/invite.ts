import { z } from "zod";
import { entityId } from "./money";
export const placeholderSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
  groupId: entityId.optional(),
});
export const friendUpdateSchema = z.strictObject({
  blocked: z.boolean().optional(),
  nickname: z.string().trim().max(100).nullable().optional(),
});
export type PlaceholderInput = z.infer<typeof placeholderSchema>;
export type FriendUpdateInput = z.infer<typeof friendUpdateSchema>;
export const createInviteSchema = z
  .strictObject({
    type: z.enum(["DIRECT", "GROUP_LINK", "PERSONAL"]),
    groupId: entityId.optional(),
    placeholderId: entityId.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "GROUP_LINK" && v.placeholderId)
      ctx.addIssue({
        code: "custom",
        message: "Group links cannot claim a placeholder",
      });
    if (v.type === "GROUP_LINK" && !v.groupId)
      ctx.addIssue({
        code: "custom",
        message: "Choose a group",
        path: ["groupId"],
      });
    if (v.type === "DIRECT" && !v.placeholderId)
      ctx.addIssue({
        code: "custom",
        message: "Choose a placeholder",
        path: ["placeholderId"],
      });
    if (v.type === "PERSONAL" && (v.groupId || v.placeholderId))
      ctx.addIssue({
        code: "custom",
        message: "Personal links cannot claim a placeholder or group",
      });
  });
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const claimInviteSchema = z.strictObject({ token: tokenSchema });
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const reportClaimSchema = z.strictObject({
  reason: z.string().trim().max(2000).default(""),
});
