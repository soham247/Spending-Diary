const error = {
  description: "Invalid input",
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
};
const envelope = (schema) => ({
  description: "Success",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["data"],
        properties: { data: schema },
      },
    },
  },
});
export function appShellContract(paths, schemas) {
  schemas.Profile = {
    type: "object",
    required: ["id", "name", "email", "defaultCurrency"],
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      email: { type: "string", format: "email" },
      image: { type: "string", nullable: true },
      onboardedAt: { type: "string", format: "date-time", nullable: true },
      notificationPrefs: {
        type: "object",
        additionalProperties: { type: "boolean" },
      },
      phone: { type: "string", nullable: true },
      upiId: { type: "string", nullable: true },
      defaultCurrency: { type: "string", enum: ["INR"] },
    },
  };
  schemas.UpdateProfile = {
    type: "object",
    additionalProperties: false,
    properties: {
      notificationPrefs: {
        type: "object",
        additionalProperties: { type: "boolean" },
      },
      completeOnboarding: { type: "boolean" },
      name: { type: "string", minLength: 1, maxLength: 100 },
      phone: { type: "string", maxLength: 30, nullable: true },
      upiId: { type: "string", maxLength: 255, nullable: true },
      defaultCurrency: { type: "string", enum: ["INR"] },
    },
  };
  const operation = (id, schema) => ({
    operationId: id,
    tags: ["Application"],
    security: [{ sessionCookie: [] }],
    responses: {
      200: envelope(schema),
      400: error,
      401: { description: "Unauthenticated" },
      404: { description: "Not found or not visible" },
    },
  });
  paths["/api/me"] = {
    get: operation("getProfile", { $ref: "#/components/schemas/Profile" }),
    patch: {
      ...operation("updateProfile", { $ref: "#/components/schemas/Profile" }),
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateProfile" },
          },
        },
      },
    },
  };
  paths["/api/expenses"] = {
    ...paths["/api/expenses"],
    get: {
      ...operation("listExpenses", {
        type: "object",
        required: ["items", "nextCursor"],
        properties: {
          items: { type: "array", items: { type: "object" } },
          nextCursor: { type: "string", nullable: true },
        },
      }),
      description:
        "Visible expenses, newest calendar date then ID. Pages contain at most 30 rows. Deleted expenses are opt-in.",
      parameters: [
        {
          name: "groupId",
          in: "query",
          schema: { type: "string", maxLength: 128 },
        },
        {
          name: "friendId",
          in: "query",
          schema: { type: "string", maxLength: 128 },
        },
        {
          name: "cursor",
          in: "query",
          schema: { type: "string", maxLength: 128 },
        },
        {
          name: "kind",
          in: "query",
          schema: { type: "string", enum: ["PERSONAL", "SHARED"] },
        },
        {
          name: "deleted",
          in: "query",
          schema: { type: "string", enum: ["true", "false"], default: "false" },
        },
      ],
    },
  };
  const list = paths["/api/expenses"].get;
  list.description +=
    " scope=mine includes only the signed-in participant with a positive owed share, adds yourShare to rows and spendingTotals per currency across all matching non-deleted expenses, independent of pagination. Inclusive from/to calendar dates must be ordered. No user ID can override the session viewer.";
  list.parameters.push(
    {
      name: "scope",
      in: "query",
      schema: { type: "string", enum: ["all", "mine"], default: "all" },
    },
    ...["from", "to"].map((name) => ({
      name,
      in: "query",
      schema: { type: "string", format: "date" },
    })),
  );
  const page =
    list.responses["200"].content["application/json"].schema.properties.data;
  page.properties.items.items.properties = {
    yourShare: {
      type: "integer",
      minimum: 0,
      nullable: true,
      description:
        "Viewer owed share in minor units; null when not participating.",
    },
  };
  page.properties.spendingTotals = {
    type: "array",
    items: {
      type: "object",
      required: ["currency", "amount"],
      properties: {
        currency: { type: "string" },
        amount: { type: "integer", minimum: 0 },
      },
    },
    description: "Present for scope=mine; excludes deleted expenses.",
  };
  list.parameters.push(
    {
      name: "history",
      in: "query",
      schema: { type: "string", enum: ["true"] },
    },
    {
      name: "month",
      in: "query",
      schema: {
        type: "string",
        pattern: "^(latest|all|(?!0000)[0-9]{4}-(0[1-9]|1[0-2]))$",
        default: "latest",
      },
    },
  );
  list.description +=
    " history=true returns availableMonths (descending YYYY-MM), selectedMonth (YYYY-MM or null), and monthlySpending totals across every matching row, independent of pagination. month defaults to latest available month; all includes every month. Explicit from/to override month selection. Scope, kind, visibility and deleted filters apply to month availability. Monthly totals always use the viewer's owed share, exclude deleted expenses, and remain separate per currency.";
  page.properties.availableMonths = {
    type: "array",
    items: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}$" },
  };
  page.properties.selectedMonth = { type: "string", nullable: true };
  page.properties.monthlySpending = {
    type: "array",
    items: {
      type: "object",
      required: ["month", "totals"],
      properties: {
        month: { type: "string" },
        totals: page.properties.spendingTotals,
      },
    },
  };
}
