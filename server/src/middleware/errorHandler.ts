import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/AppError";

const KNOWN_STATUS_ERRORS: Array<{ name: string; status: number; message: string }> = [
  { name: "CircuitBreakerOpenError", status: 503, message: "Service temporarily degraded. Please try again shortly." },
  { name: "AbortError", status: 504, message: "Request timed out." },
];

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.code) body.code = err.code;
    res.status(err.httpStatus).json(body);
    return;
  }

  if (err instanceof Error) {
    const known = KNOWN_STATUS_ERRORS.find((k) => k.name === err.name);
    if (known) {
      console.error(`[${known.name}]`, err.message);
      res.status(known.status).json({ error: known.message });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
