export function peopleContract(paths, schemas) {
  schemas.Profile.properties.discoverableByEmail = {
    type: "boolean",
    default: false,
  };
  schemas.UpdateProfile.properties.discoverableByEmail = {
    type: "boolean",
    description:
      "Off by default. Disabling also closes pending email-origin requests; unrelated profile updates never change this setting.",
  };
  const id = { type: "string", minLength: 1, maxLength: 128 };
  const ref = (name) => ({ $ref: "#/components/schemas/" + name });
  const body = (schema) => ({
    required: true,
    content: { "application/json": { schema } },
  });
  const response = (schema) => ({
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
  const error = {
    description: "Application error",
    content: { "application/json": { schema: ref("Error") } },
  };
  const operation = (operationId, schema, status = 200) => ({
    operationId,
    tags: ["Friends"],
    security: [{ sessionCookie: [] }],
    responses: {
      [status]: response(schema),
      400: error,
      401: error,
      403: error,
      404: error,
      409: error,
      429: error,
    },
  });
  schemas.PeopleSearch = {
    type: "object",
    required: ["query"],
    additionalProperties: false,
    properties: { query: { type: "string", minLength: 1, maxLength: 254 } },
  };
  schemas.PersonSearchResult = {
    type: "object",
    required: ["id", "name", "relationship", "requestId", "source"],
    additionalProperties: false,
    properties: {
      id,
      name: { type: "string" },
      relationship: {
        type: "string",
        enum: ["FRIEND", "NONE", "INCOMING", "OUTGOING"],
      },
      requestId: { ...id, nullable: true },
      source: { type: "string", enum: ["CONTEXT", "EMAIL"] },
    },
  };
  schemas.CreateFriendRequest = {
    type: "object",
    additionalProperties: false,
    properties: {
      userId: id,
      email: { type: "string", format: "email", maxLength: 254 },
      token: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
    oneOf: [
      { required: ["userId"], not: { required: ["token"] } },
      {
        required: ["token"],
        not: { anyOf: [{ required: ["userId"] }, { required: ["email"] }] },
      },
    ],
  };
  schemas.RespondFriendRequest = {
    type: "object",
    required: ["action"],
    additionalProperties: false,
    properties: { action: { type: "string", enum: ["ACCEPT", "DECLINE"] } },
  };
  schemas.FriendRequest = {
    type: "object",
    required: ["id", "userId", "name", "incoming"],
    additionalProperties: false,
    properties: {
      id,
      userId: id,
      name: { type: "string" },
      incoming: { type: "boolean" },
    },
  };
  paths["/api/people/search"] = {
    post: {
      ...operation("searchPeople", {
        type: "array",
        maxItems: 30,
        items: ref("PersonSearchResult"),
      }),
      description:
        "Names search accepted friends and active members of active shared groups. Exact email discovers other users only when they opted in. Self, blocked, deleted and unverified accounts are excluded. No email, phone, UPI or financial data is returned. Search wildcard characters are literal. Rate limit: 30/minute/viewer. POST keeps emails out of query URLs; no Idempotency-Key is needed for this read. Results are no-store.",
      requestBody: body(ref("PeopleSearch")),
    },
  };
  paths["/api/friends/requests"] = {
    get: operation("listFriendRequests", {
      type: "array",
      items: ref("FriendRequest"),
    }),
    post: {
      ...operation(
        "createFriendRequest",
        { type: "object", required: ["id"], properties: { id } },
        201,
      ),
      description:
        "Requires live proof: shared active group for userId; enabled discovery and matching full email for userId+email; or a valid PERSONAL token. IDs and stale search results alone confer no authority. Pending requests grant no financial or group permissions. Crossed requests reuse pending state without accepting. Rate limit: 10 request attempts/minute/viewer, including failed or repeated requests. Declined non-link requests have a 7-day resend cooldown; a link can bypass an email-origin decline, while the same declined link retains its cooldown.",
      parameters: [
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", minLength: 1, maxLength: 200 },
        },
      ],
      requestBody: body(ref("CreateFriendRequest")),
    },
  };
  schemas.FriendRequestPage = {
    type: "object",
    required: ["items", "nextCursor"],
    properties: {
      items: { type: "array", maxItems: 30, items: ref("FriendRequest") },
      nextCursor: { ...id, nullable: true },
    },
  };
  paths["/api/friends/requests"].get.responses[200] = response(
    ref("FriendRequestPage"),
  );
  paths["/api/friends/requests"].get.parameters = [
    { name: "cursor", in: "query", schema: id },
  ];
  paths["/api/me"].patch.responses[403] = error;
  paths["/api/invites/claim"].post.description =
    "DIRECT claims placeholder history; GROUP_LINK explicitly joins a group; PERSONAL sends a pending friend request and returns /friends without creating a friendship. Browser requests must use the application origin.";
  paths["/api/friends/requests/{id}"] = {
    patch: {
      ...operation("respondFriendRequest", {
        type: "object",
        required: ["id"],
        properties: { id },
      }),
      description:
        "Only recipient may respond. Acceptance rechecks privacy, active accounts, blocking, shared group or unrevoked personal link. Repeating same response succeeds; reversing a completed response returns 409. Creates one canonical friendship without changing money or memberships.",
      parameters: [{ name: "id", in: "path", required: true, schema: id }],
      requestBody: body(ref("RespondFriendRequest")),
    },
  };
}

export function peopleTests(add, remember) {
  const folder = "15 People discovery";
  add(folder, "Search requires authentication", "POST", "/api/people/search", {
    role: "anon",
    body: { query: "someone@example.test" },
    status: 401,
  });
  add(folder, "Empty search is invalid", "POST", "/api/people/search", {
    body: { query: " " },
    status: 400,
  });
  add(folder, "No global name directory", "POST", "/api/people/search", {
    role: "discovery",
    body: { query: "Postman" },
    code: "pm.test('No unrelated users exposed by name',()=>pm.expect(pm.response.json().data).to.eql([]));",
  });
  add(folder, "Missing person can be invited", "POST", "/api/people/search", {
    body: { query: "missing-{{run_id}}@example.test" },
    code: "pm.test('No match',()=>pm.expect(pm.response.json().data).to.eql([]));",
  });
  add(folder, "Read target email fixture", "GET", "/api/me", {
    role: "discovery",
    code: "pm.collectionVariables.set('discovery_email',pm.response.json().data.email);pm.test('Private by default',()=>pm.expect(pm.response.json().data.discoverableByEmail).to.eql(false));",
  });
  add(
    folder,
    "Opt-out conceals existing account",
    "POST",
    "/api/people/search",
    {
      body: { query: "{{discovery_email}}" },
      code: "pm.test('Private account not exposed',()=>pm.expect(pm.response.json().data).to.eql([]));",
    },
  );
  add(folder, "Enable email discovery", "PATCH", "/api/me", {
    role: "discovery",
    body: { discoverableByEmail: true },
  });
  add(
    folder,
    "Find registered person by exact email",
    "POST",
    "/api/people/search",
    {
      body: { query: "{{discovery_email}}" },
      code: "pm.test('Minimal identity only',()=>{const p=pm.response.json().data[0];pm.expect(p.id).to.eql(pm.environment.get('discovery_id'));pm.expect(p).not.to.have.property('email');pm.expect(p).not.to.have.property('phone');pm.expect(p).not.to.have.property('balances');});",
    },
  );
  add(folder, "Requests require idempotency", "POST", "/api/friends/requests", {
    body: { userId: "{{discovery_id}}" },
    status: 400,
  });
  add(
    folder,
    "User ID cannot bypass discovery",
    "POST",
    "/api/friends/requests",
    {
      body: { userId: "{{discovery_id}}" },
      key: "{{run_id}}-id-bypass",
      status: 404,
    },
  );
  add(
    folder,
    "Send email connection request",
    "POST",
    "/api/friends/requests",
    {
      body: { userId: "{{discovery_id}}", email: "{{discovery_email}}" },
      key: "{{run_id}}-discovery",
      status: 201,
      code: remember("discovery_request_id"),
    },
  );
  add(
    folder,
    "Unrelated user cannot accept request",
    "PATCH",
    "/api/friends/requests/{{discovery_request_id}}",
    { role: "friend", body: { action: "ACCEPT" }, status: 404 },
  );
  add(folder, "Recipient sees request", "GET", "/api/friends/requests", {
    role: "discovery",
    code: "pm.test('Incoming request',()=>pm.expect(pm.response.json().data.items.some(r=>r.id===pm.collectionVariables.get('discovery_request_id')&&r.incoming)).to.eql(true));",
  });
  add(folder, "Opt-out closes email requests", "PATCH", "/api/me", {
    role: "discovery",
    body: { discoverableByEmail: false },
  });
  add(
    folder,
    "Cannot accept closed email request",
    "PATCH",
    "/api/friends/requests/{{discovery_request_id}}",
    { role: "discovery", body: { action: "ACCEPT" }, status: 409 },
  );
  add(
    folder,
    "Stale result cannot send a request",
    "POST",
    "/api/friends/requests",
    {
      body: { userId: "{{discovery_id}}", email: "{{discovery_email}}" },
      key: "{{run_id}}-stale",
      status: 404,
    },
  );
  add(folder, "Private user shares connection link", "POST", "/api/invites", {
    role: "discovery",
    body: { type: "PERSONAL" },
    key: "{{run_id}}-private-link",
    status: 201,
    code: "pm.collectionVariables.set('discovery_token',pm.response.json().data.token);",
  });
  add(
    folder,
    "Link sends request without granting friendship",
    "POST",
    "/api/friends/requests",
    {
      body: { token: "{{discovery_token}}" },
      key: "{{run_id}}-link-request",
      status: 201,
      code: remember("discovery_link_request_id"),
    },
  );
  add(
    folder,
    "Private recipient accepts link request",
    "PATCH",
    "/api/friends/requests/{{discovery_link_request_id}}",
    { role: "discovery", body: { action: "ACCEPT" } },
  );
  add(
    folder,
    "Acceptance is repeatable",
    "PATCH",
    "/api/friends/requests/{{discovery_link_request_id}}",
    { role: "discovery", body: { action: "ACCEPT" } },
  );
}
