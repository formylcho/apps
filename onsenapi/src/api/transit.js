// 乗換案内API クライアント（https://api.transit.ls8h.com）
// CORS開放のためブラウザから直接呼べる。CORSが閉じた場合は BASE を '/transit-api'
// に変えれば Vite dev proxy 経由になる。
const BASE = 'https://api.transit.ls8h.com'

async function getJson(path, params) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  }
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`乗換API エラー ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * 出発地サジェスト（駅・施設・住所）
 * @param {string} q 入力文字列
 * @returns {Promise<Array<{id,name,endpoint,lat,lon,kind,description}>>}
 */
export async function suggestPlaces(q, limit = 8) {
  if (!q || !q.trim()) return []
  const data = await getJson('/api/v1/places/suggest', { q: q.trim(), limit })
  return data.places || []
}

/**
 * 経路検索
 * @param {string} fromGeo 'geo:lat,lon' もしくは feedId:stopId
 * @param {string} toGeo   同上
 * @param {{date?:string,time?:string,type?:'departure'|'arrival'|'first'|'last',numItineraries?:number}} opts
 */
export async function planRoute(fromGeo, toGeo, opts = {}) {
  const params = { from: fromGeo, to: toGeo }
  if (opts.date) params.date = opts.date // YYYYMMDD
  if (opts.time) params.time = opts.time // HH:MM
  if (opts.type) params.type = opts.type // departure | arrival | first | last
  if (opts.numItineraries) params.numItineraries = opts.numItineraries
  return getJson('/api/v1/plan', params)
}

/** 深夜0時からの秒数 → "H:MM"（翌日以降は日数を付ける） */
export function secsToHHMM(secs) {
  if (secs == null) return '--:--'
  const dayOffset = Math.floor(secs / 86400)
  const within = ((secs % 86400) + 86400) % 86400
  const h = Math.floor(within / 3600)
  const m = Math.floor((within % 3600) / 60)
  const hhmm = `${h}:${String(m).padStart(2, '0')}`
  return dayOffset > 0 ? `翌${dayOffset > 1 ? dayOffset + '日' : ''}${hhmm}` : hhmm
}

const SHINKANSEN_NAMES =
  /のぞみ|ひかり|こだま|みずほ|さくら|つばめ|はやぶさ|はやて|こまち|やまびこ|なすの|とき|たにがわ|つばさ|かがやき|はくたか|あさま|つるぎ|新幹線/

/** 区間が新幹線か */
export function legIsShinkansen(leg) {
  if (!leg || leg.kind !== 'transit') return false
  return /shinkansen/i.test(leg.tripId || '') || SHINKANSEN_NAMES.test(leg.routeName || '')
}

/** 区間が（在来線）特急か */
export function legIsLimitedExpress(leg) {
  if (!leg || leg.kind !== 'transit') return false
  if (legIsShinkansen(leg)) return false
  return /特急|ライナー|有料快速/.test((leg.routeName || '') + (leg.headsign || ''))
}

/** 経路が新幹線/特急を含むか判定 */
export function journeyModes(journey) {
  const legs = journey?.legs || []
  return {
    shinkansen: legs.some(legIsShinkansen),
    express: legs.some(legIsLimitedExpress),
  }
}

/** 秒 → "X時間Y分" / "Y分" */
export function formatDuration(secs) {
  if (secs == null) return ''
  const total = Math.round(secs / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}
