import type { RequestHandler } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";

interface ValidationSchemas {
  params?: AnyZodObject;
  query?: AnyZodObject;
  body?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }

    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    next();
  };
}
