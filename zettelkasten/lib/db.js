import Database from "better-sqlite3";
import path from "path";

let db;

export function getDb() {
  if (db) return db;
  db = new Database(path.join(process.cwd(), "zettelkasten.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      root_id INTEGER,
      label TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES memos(id)
    );
  `);
  return db;
}

// 新規ルートメモを作成。ラベルは既存ルート数 + 1。
export function createRoot(content) {
  const d = getDb();
  const rootCount = d
    .prepare("SELECT COUNT(*) AS c FROM memos WHERE parent_id IS NULL")
    .get().c;
  const label = String(rootCount + 1);
  const createdAt = new Date().toISOString();
  const info = d
    .prepare(
      "INSERT INTO memos (parent_id, root_id, label, content, created_at) VALUES (NULL, NULL, ?, ?, ?)"
    )
    .run(label, content, createdAt);
  const id = info.lastInsertRowid;
  // ルートは自分自身を root_id とする
  d.prepare("UPDATE memos SET root_id = ? WHERE id = ?").run(id, id);
  return getMemo(id);
}

// 指定メモに子として追記。ラベルは 親ラベル.(子の数 + 1)。
export function appendChild(parentId, content) {
  const d = getDb();
  const parent = getMemo(parentId);
  if (!parent) throw new Error("parent not found");
  const childCount = d
    .prepare("SELECT COUNT(*) AS c FROM memos WHERE parent_id = ?")
    .get(parentId).c;
  const label = `${parent.label}.${childCount + 1}`;
  const createdAt = new Date().toISOString();
  const info = d
    .prepare(
      "INSERT INTO memos (parent_id, root_id, label, content, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(parentId, parent.root_id, label, content, createdAt);
  return getMemo(info.lastInsertRowid);
}

export function getMemo(id) {
  return getDb().prepare("SELECT * FROM memos WHERE id = ?").get(id);
}

export function getAllMemos() {
  return getDb()
    .prepare("SELECT * FROM memos ORDER BY id ASC")
    .all();
}
