import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { documentsRouter } from "./routes/documents.js";
import { analysisRouter } from "./routes/analysis.js";


/**
 * Builds the configured app but never calls listen(). index.ts owns the
 * process; this file owns the HTTP surface. Integration tests import this.
 *
 * Middleware order matters and is not cosmetic:
 *   logging → cors → body parsing → routes → 404 → error handler
 * The error handler must be registered last or it will never fire.
 */
export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/documents", documentsRouter);
  app.use("/analysis", analysisRouter)


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
