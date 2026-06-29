// spa.or.jp の画像はホットリンク（直リンク）のため、本番では Cloudflare Pages Functions
// 経由でプロキシ＆キャッシュして確実に表示する。開発時は直URLのまま。
export function proxiedImage(url) {
  if (!url) return url
  if (import.meta.env.DEV) return url
  if (!/^https?:\/\/(www\.)?spa\.or\.jp\//.test(url)) return url
  return '/img-proxy?url=' + encodeURIComponent(url)
}
