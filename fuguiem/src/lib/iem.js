// iems.json の素のレコードから、絞り込み/表示に使う派生情報を計算するヘルパ群。
// データ(JSON)を唯一の正とし、分類ロジックはここに集約する。

export const PRICE_BANDS = [
  { id: 'b1', label: '〜3,000円', min: 0, max: 3000 },
  { id: 'b2', label: '3,000〜6,000円', min: 3000, max: 6000 },
  { id: 'b3', label: '6,000〜12,000円', min: 6000, max: 12000 },
  { id: 'b4', label: '12,000〜30,000円', min: 12000, max: 30000 },
  { id: 'b5', label: '30,000〜60,000円', min: 30000, max: 60000 },
  { id: 'b6', label: '60,000円〜', min: 60000, max: Infinity },
]

export function priceBand(jpy) {
  return PRICE_BANDS.find((b) => jpy >= b.min && jpy < b.max) || PRICE_BANDS[0]
}

// ドライバ構成から大分類（型）を決める。
export function driverType(d) {
  const dd = d.dd || 0
  const ba = d.ba || 0
  const planar = d.planar || 0
  const est = d.est || 0
  const kinds = [dd > 0, ba > 0, planar > 0, est > 0].filter(Boolean).length
  if (planar > 0 && kinds === 1) return '平面駆動'
  if (est > 0 && kinds >= 2) return 'トライブリッド'
  if (kinds >= 2) return 'ハイブリッド'
  if (ba > 0 && dd === 0) return 'BA型'
  if (dd > 0) return dd > 1 ? 'マルチDD' : 'ダイナミック'
  return 'その他'
}

// 「1DD+3BA」のような短い構成表記。
export function driverConfigShort(d) {
  const parts = []
  if (d.dd) parts.push(`${d.dd}DD`)
  if (d.ba) parts.push(`${d.ba}BA`)
  if (d.planar) parts.push(`${d.planar}平面`)
  if (d.est) parts.push(`${d.est}EST`)
  return parts.join('+') || '—'
}

export function totalDrivers(d) {
  return (d.dd || 0) + (d.ba || 0) + (d.planar || 0) + (d.est || 0)
}

// チャンネル内でその機種を検索する動画リンク。
// crawl で実動画URLが入っていればそちらを優先する。
const CHANNEL = 'https://www.youtube.com/@fugumikan'
export function videoUrl(iem) {
  if (iem.video?.url) return iem.video.url
  const q = encodeURIComponent(iem.video?.query || `${iem.brand} ${iem.model}`)
  return `${CHANNEL}/search?query=${q}`
}

export function formatJpy(jpy) {
  return '¥' + jpy.toLocaleString('ja-JP')
}

// 各レコードに派生フィールドを付与し、検索用の文字列を作る。
export function enrich(iem) {
  const type = driverType(iem.drivers)
  const band = priceBand(iem.priceJpy)
  const config = driverConfigShort(iem.drivers)
  const haystack = [
    iem.brand, iem.model, type, config, iem.signature,
    iem.connector, iem.driverDetail, iem.shell,
    ...(iem.tags || []),
  ].join(' ').toLowerCase()
  return {
    ...iem,
    name: `${iem.brand} ${iem.model}`,
    type,
    band,
    config,
    drivers_total: totalDrivers(iem.drivers),
    _haystack: haystack,
  }
}
