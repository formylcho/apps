// Cloudflare Pages Function: spa.or.jp の画像をプロキシ＆エッジキャッシュする。
// /img-proxy?url=<spa.or.jp の画像URL>
// ブラウザのリファラを送らずに取得するため、ホットリンク制限を回避できる。
export async function onRequest(context) {
  const { request } = context
  const reqUrl = new URL(request.url)
  const target = reqUrl.searchParams.get('url')
  if (!target) return new Response('missing url', { status: 400 })

  let t
  try {
    t = new URL(target)
  } catch {
    return new Response('bad url', { status: 400 })
  }
  // 許可ホストのみ（オープンプロキシ化を防ぐ）
  if (t.protocol !== 'https:' || !/(^|\.)spa\.or\.jp$/.test(t.hostname)) {
    return new Response('forbidden host', { status: 403 })
  }

  const cache = caches.default
  const cached = await cache.match(request)
  if (cached) return cached

  const upstream = await fetch(t.toString(), {
    headers: { 'User-Agent': 'onsenapi-image-proxy' },
    cf: { cacheTtl: 86400, cacheEverything: true },
  })
  if (!upstream.ok) return new Response('upstream error', { status: 502 })

  const resp = new Response(upstream.body, upstream)
  resp.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800')
  resp.headers.set('Access-Control-Allow-Origin', '*')
  resp.headers.delete('set-cookie')
  context.waitUntil(cache.put(request, resp.clone()))
  return resp
}
