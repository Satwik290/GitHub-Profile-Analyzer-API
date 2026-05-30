import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().url().optional(),
  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().default("root"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().default("github_analyzer"),
  MYSQL_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  MYSQL_SSL: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  DB_AUTO_MIGRATE: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_BASE_URL: z.string().url().default("https://api.github.com"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100)
});

// eslint-disable-next-line no-undef
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration: ${errors.join("; ")}`);
}

export const env = parsed.data;
