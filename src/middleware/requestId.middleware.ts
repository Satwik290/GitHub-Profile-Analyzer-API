import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const headerRequestId = req.header("x-request-id");
  res.locals.requestId = headerRequestId && headerRequestId.trim() ? headerRequestId : randomUUID();
  res.setHeader("x-request-id", String(res.locals.requestId));
  next();
};
