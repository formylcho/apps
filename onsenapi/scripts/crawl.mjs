// 国民保養温泉地データ生成クローラー
// 日本温泉協会(spa.or.jp) の一覧→詳細ページをクロールし、Nominatim でジオコーディングして
// src/data/onsen.json を生成する。
//
//   npm run crawl
//
// 礼儀: User-Agent 設定・~1req/秒スロットル・生HTML/ジオコード結果を scripts/.cache にキャッシュ。
import { parse } from 'node-html-parser'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, '.cache')
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'onsen.json')
const OVERRIDES_FILE = join(__dirname, 'geo-overrides.json')
const UA = 'onsenapi-crawler/0.1 (personal project; contact: formyl.e.cho@gmail.com)'
const LIST_BASE = 'https://www.spa.or.jp/kokumin/'

const PREFS = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県',
  '埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県',
  '佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function ensureCache() {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true })
  if (!existsSync(dirname(OUT_FILE))) await mkdir(dirname(OUT_FILE), { recursive: true })
}

function cacheKey(url) {
  return url.replace(/[^a-z0-9]+/gi, '_').slice(0, 120) + '.html'
}

// HTMLをキャッシュ付きで取得（スロットル付き）
async function fetchHtml(url, { throttleMs = 1100 } = {}) {
  const file = join(CACHE_DIR, cacheKey(url))
  if (existsSync(file)) return readFile(file, 'utf-8')
  process.stdout.write(`  GET ${url}\n`)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  await writeFile(file, html)
  await sleep(throttleMs)
  return html
}

const clean = (s) => (s || '').replace(/　/g, ' ').replace(/\s+/g, ' ').trim()

// 直前のテキスト窓から都道府県を推定
function prefBefore(html, pos) {
  const window = html.slice(Math.max(0, pos - 300), pos)
  let pref = ''
  let best = -1
  for (const p of PREFS) {
    const idx = window.lastIndexOf(p)
    if (idx > best) {
      best = idx
      pref = p
    }
  }
  return pref
}

// 一覧ページ群から温泉地リストを収集
async function collectList() {
  const seen = new Map()
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? LIST_BASE : `${LIST_BASE}page/${page}/`
    let html
    try {
      html = await fetchHtml(url)
    } catch {
      break
    }
    let foundOnPage = 0
    // テキスト付きリンク（画像リンクではなく名称リンク）を1件ずつ位置付きで走査。
    // 各名称リンクの直前窓に、その温泉地の都道府県ラベルが入っている。
    const re = /<a\s+href="https:\/\/www\.spa\.or\.jp\/kokumin\/(\d+)\/"[^>]*>([\s\S]*?)<\/a>/g
    let m
    while ((m = re.exec(html))) {
      const id = m[1]
      const name = clean(m[2].replace(/<[^>]+>/g, ''))
      if (!name) continue // 画像のみのリンクはスキップ
      foundOnPage++
      if (seen.has(id)) continue
      const pref = prefBefore(html, m.index)
      seen.set(id, { id, url: `https://www.spa.or.jp/kokumin/${id}/`, listName: name, prefecture: pref })
    }
    if (foundOnPage === 0) break
  }
  return [...seen.values()]
}

// 「名前（かな）」を分解
function splitName(full) {
  const m = full.match(/^(.*?)（([^（）]*)）\s*$/)
  if (m) return { name: clean(m[1]), kana: clean(m[2]) }
  return { name: clean(full), kana: '' }
}

// ラベル<h4|h5>の直後のテキスト(<p>)を取得
function textAfterHeading(root, labelRe) {
  for (const h of root.querySelectorAll('h4, h5')) {
    if (labelRe.test(clean(h.text))) {
      let el = h.nextElementSibling
      const parts = []
      while (el && !/^H[1-5]$/i.test(el.tagName || '')) {
        if (el.tagName === 'P') {
          const t = clean(el.text)
          if (t && !/^MAP\b/.test(t)) parts.push(t)
        }
        el = el.nextElementSibling
      }
      if (parts.length) return parts.join('\n')
    }
  }
  return ''
}

// 詳細ページを解析
function parseDetail(html, base) {
  const root = parse(html)
  const titleRaw = clean(root.querySelector('title')?.text || '')
  const title = titleRaw.replace(/\s*[|｜].*$/, '')
  // 名称は詳細ページの<title>（完全・整形済）を優先、かなは一覧名の（…）から取得。
  const fromTitle = splitName(title)
  const fromList = splitName(base.listName || '')
  const name = fromTitle.name || fromList.name
  const kana = fromList.kana || fromTitle.kana

  // 概要(ss1): catch + 本文
  const ss1 = root.querySelector('#ss1')
  const catch_ = clean(ss1?.querySelector('.catch')?.text || '')
  let summary = ''
  if (ss1) {
    const ps = ss1.querySelectorAll('p').map((p) => clean(p.text)).filter(Boolean)
    summary = ps.filter((t) => t !== catch_).join('\n')
  }

  const highlight = textAfterHeading(root, /見どころ/)
  const access = textAfterHeading(root, /アクセス/) || (() => {
    const ss3 = root.querySelector('#ss3')
    const p = ss3?.querySelectorAll('p').map((x) => clean(x.text)).find((t) => t && !/^MAP/.test(t))
    return p || ''
  })()
  const springQuality = textAfterHeading(root, /泉質/)
  const effects = textAfterHeading(root, /適応症|効能/)
  const capacity = textAfterHeading(root, /収容力|宿泊施設数/)

  // 問い合わせ先(ss5): リンクと電話番号
  const contacts = []
  const ss5 = root.querySelector('#ss5')
  if (ss5) {
    for (const a of ss5.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || ''
      const label = clean(a.text)
      if (/^https?:/.test(href) && !/spa\.or\.jp/.test(href)) {
        contacts.push({ label: label || href, url: href })
      }
    }
    const text = clean(ss5.text)
    const tel = text.match(/0\d{1,4}-\d{1,4}-\d{3,4}/g)
    if (tel) for (const t of [...new Set(tel)]) contacts.push({ label: '電話', tel: t })
  }
  const officialUrl = contacts.find((c) => c.url)?.url || ''

  return {
    id: base.id,
    name,
    kana,
    fullName: title || name,
    prefecture: base.prefecture || '',
    catch: catch_,
    summary,
    highlight,
    access,
    springQuality,
    effects,
    capacity,
    contacts,
    officialUrl,
    sourceUrl: base.url,
  }
}

// ---- ジオコーディング (Nominatim, 1req/秒厳守) ----
async function loadGeoCache() {
  const f = join(CACHE_DIR, 'geo.json')
  if (existsSync(f)) return JSON.parse(await readFile(f, 'utf-8'))
  return {}
}
async function saveGeoCache(c) {
  await writeFile(join(CACHE_DIR, 'geo.json'), JSON.stringify(c, null, 2))
}

async function nominatim(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', query)
  url.searchParams.set('countrycodes', 'jp')
  url.searchParams.set('limit', '1')
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const arr = await res.json()
  if (!arr.length) return null
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display: arr[0].display_name }
}

// 乗換APIのサジェストをフォールバックに
async function transitSuggest(query) {
  const url = new URL('https://api.transit.ls8h.com/api/v1/places/suggest')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const p = (data.places || [])[0]
  if (!p) return null
  return { lat: p.lat, lon: p.lon, display: p.name + '(transit)' }
}

function geocodeQueries(o) {
  const base = o.name.replace(/温泉郷|温泉群|温泉/g, '').replace(/[－―\-・].*$/, '').trim()
  const pref = o.prefecture || ''
  return [
    `${base}温泉 ${pref}`.trim(),
    `${o.name.replace(/[－―\-].*$/, '')} ${pref}`.trim(),
    `${base} ${pref}`.trim(),
  ]
}

async function geocodeAll(items) {
  const cache = await loadGeoCache()
  const overrides = existsSync(OVERRIDES_FILE)
    ? JSON.parse(await readFile(OVERRIDES_FILE, 'utf-8'))
    : {}
  let missing = 0
  for (const o of items) {
    if (overrides[o.id]) {
      o.lat = overrides[o.id].lat
      o.lon = overrides[o.id].lon
      continue
    }
    if (cache[o.id]) {
      o.lat = cache[o.id].lat
      o.lon = cache[o.id].lon
      continue
    }
    let geo = null
    for (const q of geocodeQueries(o)) {
      try {
        geo = await nominatim(q)
      } catch {}
      await sleep(1100) // Nominatim: 1req/秒厳守
      if (geo) {
        process.stdout.write(`  geo ✓ ${o.name} → ${geo.lat},${geo.lon} (${q})\n`)
        break
      }
    }
    if (!geo) {
      try {
        geo = await transitSuggest(o.name)
      } catch {}
    }
    if (geo) {
      cache[o.id] = { lat: geo.lat, lon: geo.lon }
      o.lat = geo.lat
      o.lon = geo.lon
      await saveGeoCache(cache)
    } else {
      o.lat = null
      o.lon = null
      missing++
      process.stdout.write(`  geo ✗ ${o.name} (${o.prefecture})\n`)
    }
  }
  return missing
}

async function main() {
  await ensureCache()
  console.log('▶ 一覧ページを収集...')
  const list = await collectList()
  console.log(`  ${list.length} 件の温泉地を検出`)

  console.log('▶ 詳細ページを解析...')
  const items = []
  for (const base of list) {
    try {
      const html = await fetchHtml(base.url)
      items.push(parseDetail(html, base))
    } catch (e) {
      console.warn(`  解析失敗 ${base.url}: ${e.message}`)
      items.push({ ...base, name: splitName(base.listName).name, kana: splitName(base.listName).kana })
    }
  }

  console.log('▶ ジオコーディング (Nominatim)...')
  const missing = await geocodeAll(items)

  items.sort((a, b) => PREFS.indexOf(a.prefecture) - PREFS.indexOf(b.prefecture))
  await writeFile(OUT_FILE, JSON.stringify(items, null, 2))
  console.log(`✅ ${OUT_FILE} に ${items.length} 件を書き出し（座標欠損 ${missing} 件）`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
