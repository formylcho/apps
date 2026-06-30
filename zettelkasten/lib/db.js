import { createClient } from "@libsql/client";

let client;
let initPromise;

function getClient() {
  if (client) return client;
  // 本番: Turso のリモートURL / ローカル: 同ディレクトリの SQLite ファイル
  const url = process.env.TURSO_DATABASE_URL || "file:zettelkasten.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  client = createClient({ url, authToken });
  return client;
}

// テーブルを一度だけ用意（初回アクセス時）
async function db() {
  if (!initPromise) {
    initPromise = (async () => {
      const c = getClient();
      await c.execute(`
        CREATE TABLE IF NOT EXISTS memos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          parent_id INTEGER,
          root_id INTEGER,
          label TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (parent_id) REFERENCES memos(id)
        );
      `);
      // 既存DB（user_id 列なし）向けのマイグレーション。既にあればエラーを無視。
      try {
        await c.execute("ALTER TABLE memos ADD COLUMN user_id TEXT");
      } catch {
        // duplicate column → 無視
      }
      await c.execute(
        "CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id)"
      );
    })();
  }
  await initPromise;
  return getClient();
}

// libSQL の Row を素のオブジェクトに変換
function plain(row) {
  return row ? { ...row } : undefined;
}

// 新規ルートメモを作成。ラベルは「そのユーザーの」既存ルート数 + 1。
export async function createRoot(userId, content) {
  const c = await db();
  const cnt = await c.execute({
    sql: "SELECT COUNT(*) AS c FROM memos WHERE user_id = ? AND parent_id IS NULL",
    args: [userId],
  });
  const label = String(Number(cnt.rows[0].c) + 1);
  const createdAt = new Date().toISOString();
  const res = await c.execute({
    sql: "INSERT INTO memos (user_id, parent_id, root_id, label, content, created_at) VALUES (?, NULL, NULL, ?, ?, ?)",
    args: [userId, label, content, createdAt],
  });
  const id = Number(res.lastInsertRowid);
  // ルートは自分自身を root_id とする
  await c.execute({
    sql: "UPDATE memos SET root_id = ? WHERE id = ?",
    args: [id, id],
  });
  return getMemo(userId, id);
}

// 指定メモに子として追記。ラベルは 親ラベル.(子の数 + 1)。
// 親が本人のものでなければ拒否（他人のメモには追記できない）。
export async function appendChild(userId, parentId, content) {
  const c = await db();
  const parent = await getMemo(userId, parentId);
  if (!parent) throw new Error("parent not found");
  const cnt = await c.execute({
    sql: "SELECT COUNT(*) AS c FROM memos WHERE parent_id = ?",
    args: [parentId],
  });
  const label = `${parent.label}.${Number(cnt.rows[0].c) + 1}`;
  const createdAt = new Date().toISOString();
  const res = await c.execute({
    sql: "INSERT INTO memos (user_id, parent_id, root_id, label, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [userId, parentId, parent.root_id, label, content, createdAt],
  });
  return getMemo(userId, Number(res.lastInsertRowid));
}

export async function getMemo(userId, id) {
  const c = await db();
  const rs = await c.execute({
    sql: "SELECT * FROM memos WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return plain(rs.rows[0]);
}

export async function getAllMemos(userId) {
  const c = await db();
  const rs = await c.execute({
    sql: "SELECT * FROM memos WHERE user_id = ? ORDER BY id ASC",
    args: [userId],
  });
  return rs.rows.map(plain);
}
