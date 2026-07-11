// Sets up a real SQLite database file at backend/data/app.db, using Node's
// OWN BUILT-IN SQLite support (the "node:sqlite" module) — no external
// package, no native compilation step, no Visual Studio / build tools
// needed. Requires Node.js 22.5+ (stable without a flag since Node 23.4 /
// 22.13). Run `node -v` to check your version if this errors.

import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "app.db");

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saved_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    saved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, job_id)
  );
`);

console.log(`SQLite database ready at ${DB_PATH}`);
