import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mysql, { type PoolOptions } from "mysql2/promise";
import { env } from "./env";

interface DatabaseSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

const databaseSettings = buildDatabaseSettings();

export function getDatabaseConnectionSummary(): Record<string, unknown> {
  return {
    host: databaseSettings.host,
    port: databaseSettings.port,
    database: databaseSettings.database,
    user: databaseSettings.user,
    ssl: databaseSettings.ssl,
    source: env.DATABASE_URL ? "DATABASE_URL" : "MYSQL_*",
    connectionLimit: env.MYSQL_CONNECTION_LIMIT
  };
}

const poolOptions: PoolOptions = {
  host: databaseSettings.host,
  port: databaseSettings.port,
  user: databaseSettings.user,
  password: databaseSettings.password,
  database: databaseSettings.database,
  waitForConnections: true,
  connectionLimit: env.MYSQL_CONNECTION_LIMIT,
  namedPlaceholders: true,
  decimalNumbers: true,
  ...(databaseSettings.ssl
    ? {
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true
        }
      }
    : {})
};

export const pool = mysql.createPool(poolOptions);

export async function assertDatabaseConnection(): Promise<void> {
  await ensureDatabaseExists();

  const connection = await pool.getConnection();
  try {
    if (env.DB_AUTO_MIGRATE) {
      await runSchemaMigration(connection);
    }

    await connection.ping();
  } finally {
    connection.release();
  }
}

async function ensureDatabaseExists(): Promise<void> {
  const connection = await mysql.createConnection({
    host: databaseSettings.host,
    port: databaseSettings.port,
    user: databaseSettings.user,
    password: databaseSettings.password,
    namedPlaceholders: true,
    ...(databaseSettings.ssl
      ? {
          ssl: {
            minVersion: "TLSv1.2",
            rejectUnauthorized: true
          }
        }
      : {})
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${escapeIdentifier(databaseSettings.database)}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function runSchemaMigration(connection: mysql.PoolConnection): Promise<void> {
  const schemaPath = join(process.cwd(), "database", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  const statements = schema
    .replaceAll("github_analyzer", databaseSettings.database)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

function escapeIdentifier(identifier: string): string {
  return identifier.replaceAll("`", "``");
}

function buildDatabaseSettings(): DatabaseSettings {
  if (!env.DATABASE_URL) {
    return {
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      ssl: env.MYSQL_SSL ?? false
    };
  }

  const url = new URL(env.DATABASE_URL);
  const host = url.hostname;
  const port = url.port ? Number(url.port) : 3306;
  const database = url.pathname.replace(/^\//, "") || env.MYSQL_DATABASE;
  const sslFromQuery = url.searchParams.get("ssl") ?? url.searchParams.get("sslaccept");
  const isTidbCloud = host.includes("tidbcloud.com") || port === 4000;

  return {
    host,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: env.MYSQL_SSL ?? (isTidbCloud || sslFromQuery === "true" || sslFromQuery === "strict")
  };
}
