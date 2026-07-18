import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiError = {
  success: false;
  error: string;
  message: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data, message },
    { status }
  );
}

export function fail(
  error: string,
  message = "Request failed",
  status = 400
) {
  return NextResponse.json<ApiError>(
    { success: false, error, message },
    { status }
  );
}

export function fromError(error: unknown, status = 500) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  return fail("INTERNAL_ERROR", message, status);
}
