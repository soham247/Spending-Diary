export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export async function responseData<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ??
        "Couldn't save. Check your connection and try again.",
      body.error?.fields,
      response.headers.has("Retry-After")
        ? Number(response.headers.get("Retry-After"))
        : undefined,
    );
  return body.data as T;
}
