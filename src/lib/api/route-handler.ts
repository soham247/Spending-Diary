import { ZodError } from "zod";
import { AppError, ValidationError } from "@/lib/utils/errors";

export function routeHandler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async req => {
    try { return await fn(req); } catch (error) { return mapError(error); }
  };
}
export function mapError(error: unknown): Response {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map(issue => [issue.path.join("."), issue.message]));
    const domain = error.issues.every(issue => issue.code === "custom" && issue.params?.domain);
    return Response.json({ error: { code: domain ? "DOMAIN_ERROR" : "VALIDATION_ERROR", message: "Invalid input.", fields } }, { status: domain ? 422 : 400 });
  }
  if (error instanceof SyntaxError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Malformed JSON." } }, { status: 400 });
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, { status: error.statusCode });
  }
  console.error("[route-error]", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
}
export function requireIdempotencyKey(req: Request): string {
  const key = req.headers.get("Idempotency-Key")?.trim();
  if (!key || key.length > 200) throw new ValidationError("Idempotency-Key must contain 1 to 200 characters");
  return key;
}
