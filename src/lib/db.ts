import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));

// Next imports this from several worker processes at once; they queue instead
// of failing with SQLITE_BUSY.
db.pragma("busy_timeout = 5000");

// The busy timeout does not cover a journal-mode switch — SQLite refuses that
// outright while another connection is open — so take WAL only if we can.
try {
  if (db.pragma("journal_mode", { simple: true }) !== "wal") {
    db.pragma("journal_mode = WAL");
  }
} catch {
  // Another worker won the race; it leaves the database in WAL anyway.
}

// The .sql files are the schema, replayed on boot. No migration runner: editing
// an existing table is a no-op against a database that has it, so change the
// file and delete data/app.db.
const schemaDir = path.join(process.cwd(), "db", "schemas");
for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort()) {
  db.exec(fs.readFileSync(path.join(schemaDir, file), "utf-8"));
}

export default db;
