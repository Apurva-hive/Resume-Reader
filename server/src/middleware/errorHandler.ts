import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { MulterError } from "multer";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  });
}

/**
 * Must declare all four parameters. Express identifies error handlers by
 * arity — drop `_next` and this silently becomes ordinary middleware that
 * never runs.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }
  
  if (err instanceof MulterError) {
  const message =
    err.code === "LIMIT_FILE_SIZE"
      ? "File is too large. Maximum size is 5 MB."
      : `Upload failed: ${err.message}`;
  res.status(413).json({ error: { code: err.code, message } });
  return;
}

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}
