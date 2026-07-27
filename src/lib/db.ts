import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

// SQLite ignores REFERENCES clauses unless this is on, so the ON DELETE CASCADE
// from messages to email_accounts is inert without it.
db.pragma("foreign_keys = ON");

// Every schema file, in filename order. They are all idempotent (CREATE TABLE IF
// NOT EXISTS), so replaying them on each boot is a no-op once applied.
const schemaDir = path.join(process.cwd(), "db", "schemas");
for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort()) {
  db.exec(fs.readFileSync(path.join(schemaDir, file), "utf-8"));
}

export default db;
