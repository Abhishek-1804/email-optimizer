import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "app.db"));

// Next imports this from several worker processes at once; they queue instead
// of failing with SQLITE_BUSY.
sqlite.pragma("busy_timeout = 5000");

// Off by default in SQLite; without it every REFERENCES/CASCADE is inert.
sqlite.pragma("foreign_keys = ON");

// The busy timeout does not cover a journal-mode switch — SQLite refuses that
// outright while another connection is open — so take WAL only if we can.
try {
  if (sqlite.pragma("journal_mode", { simple: true }) !== "wal") {
    sqlite.pragma("journal_mode = WAL");
  }
} catch {
  // Another worker won the race; it leaves the database in WAL anyway.
}

const db = drizzle(sqlite, { schema });

// Applies db/migrations in order, once each, tracked by drizzle in its own
// table. Adding a column now means editing schema.ts and running
// `just db-generate` — no more hand-written ALTER or deleting the database.
migrate(db, { migrationsFolder: path.join(process.cwd(), "db", "migrations") });

export default db;
export { schema };
