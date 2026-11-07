export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
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
    );
  return body.data as T;
}
