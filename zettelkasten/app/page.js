"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

// flat なメモ配列からツリー（ルート配列）を組み立てる
function buildTrees(memos) {
  const byId = new Map();
  memos.forEach((m) => byId.set(m.id, { ...m, children: [] }));
  const roots = [];
  byId.forEach((node) => {
    if (node.parent_id == null) roots.push(node);
    else {
      const p = byId.get(node.parent_id);
      if (p) p.children.push(node);
      else roots.push(node);
    }
  });
  return roots;
}

function rootPreview(node) {
  return node.content;
}

function countNodes(node) {
  let n = 1;
  node.children.forEach((c) => (n += countNodes(c)));
  return n;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [memos, setMemos] = useState(null);
  // view: compose | home | menu | all | tree | randomMemo
  const [view, setView] = useState("loading");
  const [currentRootId, setCurrentRootId] = useState(null); // home / tree
  const [randomMemoId, setRandomMemoId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [appendingId, setAppendingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/memos", { cache: "no-store" });
    const data = await res.json();
    setMemos(data);
    return data;
  }, []);

  // 初期ロード（ログイン済みのときだけ）
  useEffect(() => {
    if (status !== "authenticated") return;
    load().then((data) => {
      if (data.length === 0) {
        setView("compose");
      } else {
        const roots = buildTrees(data);
        const r = roots[Math.floor(Math.random() * roots.length)];
        setCurrentRootId(r.id);
        setView("home");
      }
    });
  }, [load, status]);

  const trees = memos ? buildTrees(memos) : [];
  const treeById = (id) => trees.find((t) => t.id === id);

  function resetInteraction() {
    setSelectedId(null);
    setAppendingId(null);
    setDraft("");
  }

  // 新規ルートメモを投稿
  async function postRoot() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    const data = await load();
    setBusy(false);
    setDraft("");
    // 投稿後はメニューへ
    const roots = buildTrees(data);
    setCurrentRootId(roots[roots.length - 1].id);
    setView("menu");
  }

  // 指定メモに追記
  async function submitAppend(parentId, after) {
    if (!draft.trim() || busy) return;
    setBusy(true);
    await fetch(`/api/memos/${parentId}/append`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    await load();
    setBusy(false);
    resetInteraction();
    after && after();
  }

  function goRandomMemo() {
    if (!memos || memos.length === 0) return;
    const m = memos[Math.floor(Math.random() * memos.length)];
    setRandomMemoId(m.id);
    resetInteraction();
    setView("randomMemo");
  }

  function goHomeRandom() {
    const roots = buildTrees(memos);
    const r = roots[Math.floor(Math.random() * roots.length)];
    setCurrentRootId(r.id);
    resetInteraction();
    setView("home");
  }

  // ---- 再帰的ツリー描画 ----
  function TreeNode({ node }) {
    const isSelected = selectedId === node.id;
    const isAppending = appendingId === node.id;
    return (
      <div>
        <div
          className={"node" + (isSelected ? " selected" : "")}
          onClick={() => {
            if (appendingId) return;
            setSelectedId(isSelected ? null : node.id);
          }}
        >
          <span className="ruby">メモ{node.label}</span>
          <span className="body">{node.content}</span>
        </div>

        {isSelected && !isAppending && (
          <div className="row" style={{ marginLeft: 12, marginTop: 8 }}>
            <button
              className="btn primary"
              onClick={(e) => {
                e.stopPropagation();
                setAppendingId(node.id);
                setDraft("");
              }}
            >
              このメモに追記
            </button>
            <button
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(null);
              }}
            >
              閉じる
            </button>
          </div>
        )}

        {isAppending && (
          <div style={{ marginLeft: 12, marginTop: 10 }}>
            <textarea
              className="append"
              autoFocus
              placeholder={`メモ${node.label} に追記…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="row">
              <button
                className="btn primary"
                disabled={busy || !draft.trim()}
                onClick={() =>
                  submitAppend(
                    node.id,
                    view === "home" ? () => setView("menu") : undefined
                  )
                }
              >
                追記する
              </button>
              <button className="btn" onClick={resetInteraction}>
                やめる
              </button>
            </div>
          </div>
        )}

        {node.children.length > 0 && (
          <div className="children">
            {node.children.map((c) => (
              <TreeNode key={c.id} node={c} />
            ))}
          </div>
        )}
      </div>
    );
  }

  function Topbar() {
    return (
      <div className="topbar">
        <span style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <button className="brand" onClick={() => setView("menu")}>
            ZETTELKASTEN
          </button>
          <a className="navlink" href="/about">
            このアプリについて
          </a>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {session?.user && (
            <span className="hint" title={session.user.email || ""}>
              {session.user.name || session.user.email}
            </span>
          )}
          <button className="navlink" onClick={() => signOut()}>
            ログアウト
          </button>
        </span>
      </div>
    );
  }

  // 認証ゲート：未ログインならログイン画面、判定中はローディング
  if (status === "loading") {
    return (
      <div className="wrap">
        <div className="empty">読み込み中…</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="wrap fade">
        <div className="topbar">
          <span className="brand">ZETTELKASTEN</span>
          <a className="navlink" href="/about">
            このアプリについて
          </a>
        </div>
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>
            考えを継ぎ足して育てるノート
          </h1>
          <p className="hint" style={{ marginBottom: 32 }}>
            あなた専用の非公開ノートです。ログインして始めましょう。
          </p>
          <button className="btn primary" onClick={() => signIn("google")}>
            Google でログイン
          </button>
        </div>
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div className="wrap">
        <div className="empty">読み込み中…</div>
      </div>
    );
  }

  // ---- 白紙：新規投稿 ----
  if (view === "compose") {
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">新しいメモ</p>
        <textarea
          className="compose"
          autoFocus
          placeholder="ここに考えを書く…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="row">
          <button
            className="btn primary"
            disabled={busy || !draft.trim()}
            onClick={postRoot}
          >
            投稿する
          </button>
          {memos && memos.length > 0 && (
            <button className="btn" onClick={() => setView("menu")}>
              もどる
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- 起動時：ランダムなツリー1つ ----
  if (view === "home") {
    const root = treeById(currentRootId);
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">きょうの一本（ランダム）</p>
        {root ? (
          <>
            <div className="tree">
              <TreeNode node={root} />
            </div>
            <div className="row" style={{ marginTop: 28 }}>
              <span className="hint">
                メモを選んで追記、または……
              </span>
              <button className="btn" onClick={() => setView("menu")}>
                スキップ
              </button>
            </div>
          </>
        ) : (
          <div className="empty">メモがありません</div>
        )}
      </div>
    );
  }

  // ---- メニュー ----
  if (view === "menu") {
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">つぎにすること</p>
        <button
          className="menu-card"
          onClick={() => {
            resetInteraction();
            setView("all");
          }}
        >
          <div className="t">すべてのツリーを見る</div>
          <div className="d">蓄積したメモの全体を俯瞰し、選んで追記する</div>
        </button>
        <button className="menu-card" onClick={goRandomMemo}>
          <div className="t">別のメモに追記する</div>
          <div className="d">ランダムなメモが表示され、その場で追記できる</div>
        </button>
        <button
          className="menu-card"
          onClick={() => {
            setDraft("");
            setView("compose");
          }}
        >
          <div className="t">新しいメモを書く</div>
          <div className="d">白紙に新しい考えを投稿する</div>
        </button>
      </div>
    );
  }

  // ---- すべてのツリー一覧 ----
  if (view === "all") {
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">すべてのツリー</p>
        {trees.length === 0 ? (
          <div className="empty">まだメモがありません</div>
        ) : (
          trees.map((t) => (
            <div
              key={t.id}
              className="tree-card"
              onClick={() => {
                resetInteraction();
                setCurrentRootId(t.id);
                setView("tree");
              }}
            >
              <div>
                <span className="ruby">メモ{t.label}</span>
                <span className="preview">{rootPreview(t)}</span>
              </div>
              <div className="count">{countNodes(t)} 個のメモ</div>
            </div>
          ))
        )}
        <div className="row" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => setView("menu")}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  // ---- ツリー詳細（閲覧 / 追記） ----
  if (view === "tree") {
    const root = treeById(currentRootId);
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">メモ{root ? root.label : ""} のツリー</p>
        {root ? (
          <div className="tree">
            <TreeNode node={root} />
          </div>
        ) : (
          <div className="empty">見つかりません</div>
        )}
        <div className="row" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => setView("all")}>
            一覧へもどる
          </button>
          <button className="btn" onClick={() => setView("menu")}>
            メニュー
          </button>
        </div>
      </div>
    );
  }

  // ---- 別のメモに追記（ランダム単体メモ） ----
  if (view === "randomMemo") {
    const m = memos.find((x) => x.id === randomMemoId);
    return (
      <div className="wrap fade">
        <Topbar />
        <p className="section-title">ランダムなメモに追記</p>
        {m ? (
          <>
            <div className="node selected" style={{ cursor: "default" }}>
              <span className="ruby">メモ{m.label}</span>
              <span className="body">{m.content}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <textarea
                className="append"
                autoFocus
                placeholder={`メモ${m.label} に追記…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="row">
                <button
                  className="btn primary"
                  disabled={busy || !draft.trim()}
                  onClick={() => submitAppend(m.id, () => setView("menu"))}
                >
                  追記する
                </button>
                <button className="btn" onClick={goRandomMemo}>
                  別のメモ
                </button>
                <button className="btn" onClick={() => setView("menu")}>
                  メニューへ
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">メモがありません</div>
        )}
      </div>
    );
  }

  return null;
}
