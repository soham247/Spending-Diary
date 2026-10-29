import { ZodError } from "zod";
import { AppError } from "@/lib/utils/errors";

/**
 * Wraps a route handler in uniform error-to-response mapping.
 * Every route uses this so try/catch is never duplicated.
 *
 * Usage:
 *   export const POST = routeHandler(async (req) => {
 *     const session = await requireSession(req);
 *     ...
 *     return Response.json({ data: result }, { status: 201 });
 *   });
 */
export function routeHandler(
  fn: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      return mapError(err);
    }
  };
}

export function mapError(err: unknown): Response {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } },
      { status: 400 },
    );
  }

  if (err instanceof AppError) {
    return Response.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      },
      { status: err.statusCode },
    );
  }

  // Domain errors thrown with a plain Error + .code
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    if (code === "NOT_FOUND") {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Not found." } },
        { status: 404 },
      );
    }
    if (code === "VERSION_CONFLICT") {
      return Response.json(
        { error: { code: "CONFLICT", message: err.message } },
        { status: 409 },
      );
    }
    if (code === "INVALID_INPUT") {
      return Response.json(
        { error: { code: "DOMAIN_ERROR", message: err.message } },
        { status: 422 },
      );
    }
  }

  console.error("[route-error]", err);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 },
  );
}

/**
 * Reads and validates the Idempotency-Key header.
 * Throws a 400-equivalent error if missing.
 */
export function requireIdempotencyKey(req: Request): string {
  const key = req.headers.get("Idempotency-Key")?.trim();
  if (!key) {
    throw Object.assign(
      new Error("Idempotency-Key header is required"),
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }
  return key;
}
