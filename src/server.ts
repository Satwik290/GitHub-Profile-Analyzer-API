import { assertDatabaseConnection, getDatabaseConnectionSummary } from "./config/database";
import { env } from "./config/env";
import { createApp } from "./app";
import { logger } from "./utils/logger";
import process from "process";

async function bootstrap(): Promise<void> {
  await assertDatabaseConnection();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info("GitHub Profile Analyzer API started", {
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      environment: env.NODE_ENV
    });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error("Failed to start API: port is already in use", {
        port: env.PORT,
        hint: `Another process is already listening on port ${env.PORT}. Stop that process or set PORT to another value in .env, for example PORT=3001.`
      });
      process.exit(1);
    }

    logger.error("Failed to start API listener", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  });
}

void bootstrap().catch((error) => {
  const details = formatStartupError(error);
  logger.error("Failed to start API", {
    ...details,
    database: getDatabaseConnectionSummary(),
    hint:
      "MySQL is not reachable. Start MySQL, verify .env credentials, create the database with database/schema.sql, or set MYSQL_HOST=127.0.0.1 if localhost resolves incorrectly."
  });
  process.exit(1);
});

function formatStartupError(error: unknown): Record<string, unknown> {
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message || "Multiple connection attempts failed",
      errors: error.errors.map((item) => {
        if (item instanceof Error) {
          return {
            name: item.name,
            message: item.message,
            code: "code" in item ? item.code : undefined,
            address: "address" in item ? item.address : undefined,
            port: "port" in item ? item.port : undefined
          };
        }

        return String(item);
      }),
      stack: error.stack
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || "Unknown startup error",
      code: "code" in error ? error.code : undefined,
      stack: error.stack
    };
  }

  return { message: String(error) };
}
