# デプロイ手順（Vercel + Turso + Google ログイン）

各ユーザーが Google でログインし、自分専用の非公開ノートを持つ構成です。
ローカルは環境変数の有無で自動的に `file:zettelkasten.db` を使い、本番は Turso を使います。

必要な環境変数（`.env.example` 参照）:

| 変数 | 用途 |
|---|---|
| `AUTH_SECRET` | セッション暗号化キー |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `ALLOWED_EMAILS` | ログインを許可するメール（カンマ区切り）。**自分のメールだけ書けば自分専用になる** |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | 本番DB（Turso）|

> **自分専用にするだけなら**: `ALLOWED_EMAILS` に自分の Gmail を入れるだけ。
> 公開URLでも、他の Google アカウントは「アクセス拒否」で弾かれます。
> Google の同意画面は「テスト」のままでよく（自分をテストユーザーに追加）、審査は不要です。

---

## 1. Google OAuth クライアントを作成

1. https://console.cloud.google.com で新規プロジェクト作成
2. **APIとサービス → OAuth 同意画面** を設定（External / アプリ名・メール入力）
3. **APIとサービス → 認証情報 → 認証情報を作成 → OAuth クライアントID**
   - 種類: **ウェブアプリケーション**
   - **承認済みのリダイレクトURI** に以下を追加:
     - ローカル: `http://localhost:3000/api/auth/callback/google`
     - 本番: `https://<your-app>.vercel.app/api/auth/callback/google`
4. 発行された **クライアントID** と **クライアントシークレット** を控える
   → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

> ローカルで試すには `.env.local` にこの2つを貼り付けて `npm run dev` を再起動。
> `AUTH_SECRET` は生成済みの値が `.env.local` に入っています。

## 2. Turso でDBを用意

1. https://turso.tech にサインアップ（GitHubアカウントでOK）
2. **Create Database** → 名前 `zettelkasten`
3. **Database URL**（`libsql://...`）と **Auth Token** を取得
   → `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`

> CLI 派（macOS/Linux/WSL）:
> ```
> turso db create zettelkasten
> turso db show zettelkasten --url
> turso db tokens create zettelkasten
> ```

テーブルはアプリ初回アクセス時に自動作成されます（`user_id` 列を含む）。

## 3. GitHub にプッシュ

このアプリはリポジトリ `formylcho/apps` 内の `zettelkasten/` にあります。Vercel 側で Root Directory を指定します。

## 4. Vercel でデプロイ

1. https://vercel.com → **Add New… → Project** → リポジトリを Import
2. **Root Directory** を `zettelkasten` に設定（Framework は Next.js 自動検出）
3. **Environment Variables** に上表の6つをすべて登録
4. **Deploy**
5. 発行された本番URLを、手順1のリダイレクトURIに（まだなら）追加して整合させる

完了後、`https://<your-app>.vercel.app` で誰でも自分の Google アカウントでログインでき、
**各自のメモは自分にしか見えません**。

---

## アプリとしてインストール（PWA）

デプロイ後、本番URLは「インストール可能なアプリ」として扱えます。

- **Android / Chrome / Edge（PC）**: アドレスバーのインストールアイコン、または「アプリをインストール」から追加 → 独立ウィンドウ・専用アイコンで起動
- **iPhone / Safari**: 共有ボタン → **ホーム画面に追加** → アプリのように全画面起動

オフライン完全対応（圏外で閲覧・追記）はレベルB扱いで未実装です。現状は
Service Worker がアプリ画面をキャッシュするため起動時の体感が安定しますが、
メモの取得・保存はオンラインが前提です。

> 注意: Service Worker は本番ビルド（`next start` / Vercel）でのみ有効。`npm run dev` では無効です。

## ローカル開発

```
npm run dev
```
`.env.local` に `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` を入れればローカルでもログインできます。
DBは環境変数が無ければ `file:zettelkasten.db`。

## 補足: 既存メモの扱い

`user_id` 列の追加前に作成されたローカルの古いメモは `user_id = NULL` で、
ログイン後は表示されません（他人にも見えません）。自分のものとして引き継ぎたい場合は、
ログイン後に自分の Google ユーザーIDで `UPDATE memos SET user_id = '<id>' WHERE user_id IS NULL` を実行します。
不要なら気にせず新しく書き始めて構いません。
