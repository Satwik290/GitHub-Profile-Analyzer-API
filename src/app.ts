import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimit.middleware";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import { healthRouter } from "./modules/health/health.routes";
import { profileRouter } from "./modules/profiles/profile.routes";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);
  app.use(apiRateLimiter);

  app.use("/health", healthRouter);
  app.use(`${env.API_PREFIX}/profiles`, profileRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
