import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "A conflict occurred") {
    super(message, "CONFLICT", 409);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    fields?: Record<string, string>,
  ) {
    super(message, "VALIDATION_ERROR", 400, fields);
  }
}

export class DomainError extends AppError {
  constructor(message: string) {
    super(message, "DOMAIN_ERROR", 422);
  }
}

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export function toErrorResponse(err: unknown): NextResponse<ErrorResponseBody> {
  if (err instanceof AppError) {
    return NextResponse.json(
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

  console.error("Unhandled error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 },
  );
}
