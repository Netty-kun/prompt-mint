import type { Request, Response, NextFunction } from "express";
import { type ZodType } from "zod";
import { parseRequestBody } from "../../src/lib/api/requestSchemas";

/**
 * Centralized Zod validation middleware (#211).
 *
 * Usage:
 *   router.post("/endpoint", validateBody(UnlockRequestBody), handler);
 *
 * Returns a standardized JSON error response on validation failure:
 *   {
 *     error: "Validation failed",
 *     message: "field1 is required; field2 must be a string",
 *     fields: { field1: "field1 is required", field2: "field2 must be a string" }
 *   }
 */

export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = parseRequestBody(schema, req.body);
    if (result.success) {
      req.body = result.data;
      next();
      return;
    }

    res.status(400).json({
      error: "Validation failed",
      message: result.summary,
      fields: result.fields,
    });
  };
}

/**
 * Standardized error response helper for manual validation in route handlers.
 */
export function sendValidationError(res: Response, summary: string, fields: Record<string, string>): void {
  res.status(400).json({
    error: "Validation failed",
    message: summary,
    fields,
  });
}
