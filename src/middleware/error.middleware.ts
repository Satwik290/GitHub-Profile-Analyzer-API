import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(
    new AppError({
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`
    })
  );
};

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = String(res.locals.requestId ?? "");

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Request validation failed",
        details: error.flatten(),
        requestId
      }
    });
    return;
  }

  if (error instanceof AppError) {
    logger.warn(error.message, {
      code: error.code,
      requestId,
      path: req.originalUrl,
      method: req.method,
      details: error.details
    });

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId
      }
    });
    return;
  }

  logger.error("Unhandled application error", {
    requestId,
    path: req.originalUrl,
    method: req.method,
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined
  });

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: env.NODE_ENV === "production" ? "Internal server error" : String(error),
      requestId
    }
  });
};
