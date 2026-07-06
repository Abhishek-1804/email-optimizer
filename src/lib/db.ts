import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

const schemaPath = path.join(process.cwd(), "db", "schemas", "001_init.sql");
db.exec(fs.readFileSync(schemaPath, "utf-8"));

export default db;
