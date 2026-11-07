export function paymentContract(paths, schemas) {
  const person = {
    type: "object",
    required: ["id", "name", "upiId", "net", "restricted"],
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      upiId: { type: "string", nullable: true },
      net: {
        type: "integer",
        description:
          "Viewer net against this person in this scope; positive means owed to viewer.",
      },
      restricted: {
        type: "boolean",
        description:
          "Only repayment up to the outstanding pairwise debt is permitted.",
      },
    },
  };
  const scope = {
    type: "object",
    required: ["id", "name", "currency", "people"],
    properties: {
      id: { type: "string", description: "direct or a group ID" },
      name: { type: "string" },
      currency: { type: "string", enum: ["INR"] },
      people: { type: "array", items: person },
    },
  };
  schemas.PaymentContext = { type: "array", items: scope };
  paths["/api/activity"].get.description =
    "Viewer-visible Activity includes nullable fromName, toName and paymentNote for settlement events, resolved through their settlement reference, including historical events. Creation, deletion and restoration preserve their existing event types and metadata.";
  paths["/api/settlements/context"] = {
    get: {
      operationId: "getPaymentContext",
      summary: "Get viewer-authorized payment scopes and counterparties",
      description:
        "Active members and former members with nonzero pairwise group balances are eligible. Former viewers see only their own outstanding pairwise debt. Archived groups are omitted. No general group access is granted.",
      security: [{ sessionCookie: [] }],
      responses: {
        200: {
          description: "Payment context",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  data: { $ref: "#/components/schemas/PaymentContext" },
                },
              },
            },
          },
        },
        401: { description: "Unauthenticated" },
      },
    },
  };
  paths["/api/settlements"].post.description =
    "Records a payment separately from spending. Viewer must be payer or receiver. Exactly one group or Direct scope is affected. Former members and blocked pairs may only repay existing pairwise debt, without overpayment. note is optional, at most 2000 characters. Advances, reverse payments and overpayments between unrestricted parties are supported; the UI confirms the resulting balance.";
  paths["/api/settlements/{id}/restore"].post.description =
    "Restore a soft-deleted payment, rechecking current group, former-member and blocked-pair repayment restrictions.";
}
