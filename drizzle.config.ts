import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./data/app.db" },
} satisfies Config;
