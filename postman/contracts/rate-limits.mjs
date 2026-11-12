export function rateLimitContract(paths) {
  for (const path of ["/api/people/search", "/api/friends/requests"]) {
    paths[path].post.responses[429] = {
      description: "RATE_LIMITED: viewer allowance exhausted",
      headers: {
        "Retry-After": {
          schema: { type: "integer", minimum: 1 },
          description: "Seconds until retry",
        },
      },
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/Error" } },
      },
    };
    paths[path].post.responses[503] = {
      description:
        "RATE_LIMIT_UNAVAILABLE: protection unavailable; operation not executed",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/Error" } },
      },
    };
  }
  for (const [path, properties, required] of [
    [
      "sign-up/email",
      {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8, maxLength: 128 },
        name: { type: "string" },
      },
      ["email", "password", "name"],
    ],
    [
      "sign-in/email",
      {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
      ["email", "password"],
    ],
    [
      "request-password-reset",
      {
        email: { type: "string", format: "email" },
        redirectTo: { type: "string" },
      },
      ["email"],
    ],
    [
      "send-verification-email",
      {
        email: { type: "string", format: "email" },
        callbackURL: { type: "string" },
      },
      ["email"],
    ],
  ]) {
    paths["/api/auth/" + path] = {
      post: {
        operationId: "auth_" + path.replaceAll(/[^a-z]/g, "_"),
        tags: ["Authentication"],
        description:
          "Better Auth native response format. Reset and resend use generic success when recipient cooldown suppresses mail. Redis failures return 503 before identity lookup.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties, required },
            },
          },
        },
        responses: {
          200: { description: "Native Better Auth success" },
          400: { description: "Invalid input" },
          401: { description: "Invalid credentials" },
          403: { description: "Verification required or untrusted origin" },
          429: {
            description: "IP/path allowance exhausted",
            headers: {
              "X-Retry-After": {
                description: "Seconds until retry",
                schema: { type: "integer", minimum: 1 },
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          503: {
            description: "Protection unavailable",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "message"],
                  properties: {
                    code: { type: "string", enum: ["RATE_LIMIT_UNAVAILABLE"] },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  for (const status of [429, 503]) {
    paths["/api/auth/get-session"].get.responses[status] =
      paths["/api/auth/sign-in/email"].post.responses[status];
  }
}

export function rateLimitTests(add) {
  add(
    "14 Rate limits",
    "Concurrent searches enforce shared viewer allowance",
    "POST",
    "/api/people/search",
    {
      role: "outsider",
      body: { query: "No matching fixture" },
      code: `const req={url:pm.environment.get('base_url')+'/api/people/search',method:'POST',header:{'Content-Type':'application/json','Origin':pm.environment.get('base_url'),'Cookie':pm.environment.get('outsider_cookie')},body:{mode:'raw',raw:JSON.stringify({query:'No matching fixture'})}}; const replies=await Promise.all(Array.from({length:30},()=>pm.sendRequest(req))); pm.test('Concurrent searches reach the shared limit',()=>{pm.expect(replies.filter(r=>r.code===200).length).to.eql(29);pm.expect(replies.filter(r=>r.code===429).length).to.eql(1);const denied=replies.find(r=>r.code===429);pm.expect(denied.json().error.code).to.eql('RATE_LIMITED');pm.expect(Number(denied.headers.get('Retry-After'))).to.be.above(0);});`,
    },
  );
}
