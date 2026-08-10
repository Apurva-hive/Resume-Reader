import { createApp } from "./app.js";
import { closeDb } from "./db/index.js";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

server.on("error", (err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});

// Platforms send SIGTERM on redeploy. Without this, in-flight requests are
// killed mid-response.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    server.close(async() => {
        await closeDb();
        process.exit(0)
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
