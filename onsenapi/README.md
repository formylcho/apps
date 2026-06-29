# 国民保養温泉地マップ ♨

全国の **国民保養温泉地（79か所）** を日本地図に表示し、ピン／一覧から温泉地を選ぶと、
**温泉地の詳細（泉質・効能・温泉宿の収容力・概要・公式リンク）** と、
**その温泉地までの乗換案内** を検索できる Web アプリ。

- 地図: Leaflet + OpenStreetMap
- フレームワーク: Vue 3 + Vite
- 乗換案内: [api.transit.ls8h.com](https://api.transit.ls8h.com)（CORS開放・認証不要）
- 温泉地データ: [日本温泉協会](https://www.spa.or.jp/kokumin/) をクロール、座標は OSM Nominatim でジオコーディング
- 写真ギャラリー＋温泉宿（[おすすめの宿](https://www.spa.or.jp/osusume_no_yado2/list_index.htm)を温泉地に紐付け、名前・画像・公式/協会リンク）

## 使い方

```bash
npm install
npm run dev      # 開発サーバ (http://localhost:5173)
npm run build    # 本番ビルド → dist/
```

## Cloudflare Pages へのデプロイ

静的SPA + Pages Functions（画像プロキシ）構成。サーバー不要。

### 方法A: GitHub連携（推奨）
Cloudflare ダッシュボード → Workers & Pages → Create → Pages → 「Connect to Git」で
`formylcho/apps` を選択し、以下を設定（モノレポのためルートを `onsenapi` に）:

| 設定 | 値 |
|------|----|
| Production branch | `main` |
| Root directory (advanced) | `onsenapi` |
| Build command | `npm run build` |
| Build output directory | `dist` |

`onsenapi/functions/img-proxy.js`（spa.or.jp 画像のプロキシ＆キャッシュ）は自動で検出されます。

### 方法B: Wrangler CLI
```bash
npx wrangler login            # 初回のみ
npm run build
npx wrangler pages deploy dist --project-name onsenapi
```
※ CLI で関数も配信するには Pages プロジェクトに `functions/` を含める必要があるため、
   通常は方法A（Git連携）が簡単です。

### 補足
- 乗換API（api.transit.ls8h.com）・OSMタイルは外部サービスをブラウザから直接利用（CORS開放）。
- 画像は本番では `/img-proxy?url=...`（Pages Function）経由でホットリンク制限を回避＆エッジキャッシュ。
- 位置情報（現在地から出発）は HTTPS 必須。Cloudflare Pages は標準でHTTPS。

## データの再生成

温泉地データは `src/data/onsen.json` に同梱済み。再クロールする場合:

```bash
npm run crawl
```

- 一覧→各詳細ページをクロールし、Nominatim でジオコーディングして `src/data/onsen.json` を生成。
- 取得結果は `scripts/.cache/` にキャッシュ（HTML・ジオコード）。礼儀のため ~1req/秒にスロットル。
- 自動ジオコーディングで外れる地点は `scripts/geo-overrides.json` で手動補正（温泉地ID→緯度経度）。

## 構成

| パス | 役割 |
|------|------|
| `scripts/crawl.mjs` | データ生成クローラー |
| `scripts/geo-overrides.json` | 座標の手動補正 |
| `src/data/onsen.json` | 温泉地データ（生成物） |
| `src/api/transit.js` | 乗換APIクライアント＋時刻整形ヘルパ |
| `src/components/MapView.vue` | 地図とピン |
| `src/components/DetailPanel.vue` | 温泉地詳細 |
| `src/components/TransitSearch.vue` | 出発地サジェスト＋経路検索 |
| `src/App.vue` | サイドバー一覧・検索・状態管理 |

## 出典

温泉地情報は[日本温泉協会](https://www.spa.or.jp/)、地図は OpenStreetMap、乗換案内は api.transit.ls8h.com に拠ります。
