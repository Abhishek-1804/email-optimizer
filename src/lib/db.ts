import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

// SQLite ignores REFERENCES clauses unless this is on, so any ON DELETE CASCADE
// is inert without it.
db.pragma("foreign_keys = ON");

/**
 * Applies db/schemas/*.sql in filename order, once each, tracking progress in
 * SQLite's `user_version`. Never edit a committed migration — add the next one.
 */
function migrate() {
  const dir = path.join(process.cwd(), "db", "schemas");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = db.pragma("user_version", { simple: true }) as number;

  for (let i = applied; i < files.length; i++) {
    const sql = fs.readFileSync(path.join(dir, files[i]), "utf-8");
    const version = i + 1;

    db.transaction(() => {
      db.exec(sql);
      // Not parameterizable — PRAGMA takes a literal. `version` is a loop index.
      db.pragma(`user_version = ${version}`);
    })();
  }
}

migrate();

export default db;
