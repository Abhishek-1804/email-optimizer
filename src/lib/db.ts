import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));

// Next renders across several worker processes, all importing this module at
// once. A busy timeout makes them queue for the write lock instead of failing
// instantly with SQLITE_BUSY.
db.pragma("busy_timeout = 5000");

// Switching journal mode is the one statement the busy timeout does not cover:
// SQLite refuses it outright while another connection is open, so on a fresh
// database the workers race and the losers throw. WAL is a nicety here, not a
// requirement, so take it when we can get it.
try {
  if (db.pragma("journal_mode", { simple: true }) !== "wal") {
    db.pragma("journal_mode = WAL");
  }
} catch {
  // Another worker is mid-switch. Whoever wins leaves the database in WAL.
}

// The .sql files are the schema. They're replayed on boot and are idempotent,
// so this is a no-op once applied.
//
// Editing an existing table won't take effect on a database that already has
// it — CREATE TABLE IF NOT EXISTS is a no-op there. Delete data/app.db and
// reconnect your mailboxes; it's two clicks. Worth revisiting when there's data
// that costs real time to rebuild.
const schemaDir = path.join(process.cwd(), "db", "schemas");
for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort()) {
  db.exec(fs.readFileSync(path.join(schemaDir, file), "utf-8"));
}

export default db;
