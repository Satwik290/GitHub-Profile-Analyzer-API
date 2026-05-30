import { ErrorCodes, type ErrorCode } from "./errorCodes";

interface AppErrorOptions {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  public constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }
}

export function notFound(message = "Resource not found", details?: unknown): AppError {
  return new AppError({
    statusCode: 404,
    code: ErrorCodes.NOT_FOUND,
    message,
    details
  });
}
