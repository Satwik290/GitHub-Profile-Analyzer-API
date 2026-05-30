import type { Response } from "express";
import type { ApiResponse } from "../types/api";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): void {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };

  res.status(statusCode).json(payload);
}
