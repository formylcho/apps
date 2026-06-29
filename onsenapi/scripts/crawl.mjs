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

  // 写真ギャラリー(ss2): wp-content にアップされた温泉地の写真。
  // サムネイル(…-WxH.jpg)を表示用、サフィックスを除いたものをフルサイズとして保持。
  const images = []
  const ss2 = root.querySelector('#ss2')
  if (ss2) {
    for (const img of ss2.querySelectorAll('img')) {
      const src = img.getAttribute('src') || ''
      if (!/wp-content\/uploads/.test(src)) continue
      const thumb = src.startsWith('http') ? src : `https://www.spa.or.jp${src.replace(/^\.\.?/, '')}`
      const full = thumb.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
      images.push({ thumb, full })
    }
  }

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
    images,
    inns: [],
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

// ---- おすすめの宿（日本温泉協会 会員宿）ディレクトリ ----
const YADO_INDEX = 'https://www.spa.or.jp/osusume_no_yado2/list_index.htm'
// 詳細ページのサイドバーに常時出てくる広告/共通リンク（公式サイト誤検出を防ぐ）
const AD_DOMAINS = [
  'gero-spa.com', 'kamiyamada-onsen.co.jp', 'hitou.or.jp', 'kannon-onsen.com',
  'maniwa.or.jp', 'yasuragi.buyshop.jp', 'offandrelax.jp', 'onsen-gastronomy.com',
  'env.go.jp', 'hisaka-magokoro.com', 'rurubu.travel', 'rurubu.com', 'facebook.com',
  'twitter.com', 'instagram.com', 'youtube.com', 'jalan.net', 'rakuten',
]

// 温泉地名を照合用に正規化（温泉/温泉郷/区域・かっこ・地区サフィックスを除去）
function normOnsen(s) {
  return (s || '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[－―\-].*$/, '')
    .replace(/温泉郷|温泉群|温泉|区域|高原/g, '')
    .replace(/\s/g, '')
    .trim()
}

// おすすめの宿インデックスをパースして宿一覧を返す
async function crawlInns() {
  const html = await fetchHtml(YADO_INDEX)
  const inns = []
  const blocks = html.split(/(?=<a[^>]+detail_f)/)
  for (const b of blocks) {
    const m = b.match(/detail_f\/\?F_ID=(\d+)[^"]*"/)
    if (!m) continue
    const fid = m[1]
    const nameM = b.match(/detail_f[^>]*>([\s\S]*?)<\/a>/)
    const name = nameM ? clean(nameM[1].replace(/<[^>]+>/g, '')) : ''
    if (!name) continue
    const imgM = b.match(/<img[^>]+src="([^"]+)"/)
    // src は list_index.htm からの相対 "../osusume_no_yado2/tempimage/x.jpg" → ルート基準で解決
    const image = imgM
      ? imgM[1].startsWith('http')
        ? imgM[1]
        : `https://www.spa.or.jp/${imgM[1].replace(/^(\.\.\/)+/, '')}`
      : ''
    const txt = clean(b.replace(/<[^>]+>/g, ' '))
    const prefM = txt.match(/\[([^\]]+)\]/)
    const prefecture = prefM ? prefM[1].trim() : ''
    // 都道府県の後ろ〜TELの手前が温泉地名
    const afterPref = prefM ? txt.slice(txt.indexOf(prefM[0]) + prefM[0].length) : txt
    const onsenM = afterPref.match(/^\s*(.+?)\s*(?:TEL|電話|部屋|$)/)
    const onsen = onsenM ? onsenM[1].trim() : ''
    const roomM = txt.match(/部屋数[：:]\s*([0-9]+室)/)
    const springM = txt.match(/主な泉質[】\]]\s*([^【\[]+)/)
    inns.push({
      fid,
      name,
      image,
      prefecture,
      onsen,
      rooms: roomM ? roomM[1] : '',
      spring: springM ? springM[1].trim() : '',
      detailUrl: `https://www.spa.or.jp/search_f/detail_f/?F_ID=${fid}`,
      officialUrl: '',
    })
  }
  return inns
}

// 宿詳細ページから公式サイトURLを best-effort 抽出（広告ドメインを除外）
async function fetchInnOfficial(inn) {
  try {
    const html = await fetchHtml(inn.detailUrl)
    const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
    const cand = links.filter(
      (l) => !/spa\.or\.jp/.test(l) && !AD_DOMAINS.some((d) => l.includes(d))
    )
    // 最頻ではなく最短ドメインの素朴なURL（クエリ無し）を優先
    cand.sort((a, b) => a.length - b.length)
    inn.officialUrl = cand[0] || ''
  } catch {
    inn.officialUrl = ''
  }
}

// 宿を温泉地に紐付け
function attachInns(items, inns) {
  for (const inn of inns) {
    const innKey = normOnsen(inn.onsen)
    if (!innKey) continue
    for (const o of items) {
      if (inn.prefecture && o.prefecture && !inn.prefecture.includes(o.prefecture) && !o.prefecture.includes(inn.prefecture))
        continue
      const okey = normOnsen(o.name)
      if (!okey) continue
      if (innKey.includes(okey) || okey.includes(innKey)) {
        o.inns.push(inn)
        break
      }
    }
  }
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

  console.log('▶ おすすめの宿を収集・紐付け...')
  let innCount = 0
  try {
    const inns = await crawlInns()
    attachInns(items, inns)
    const matched = items.flatMap((o) => o.inns)
    // 紐付いた宿のみ公式サイトURLを取得
    for (const inn of matched) await fetchInnOfficial(inn)
    innCount = matched.length
    const withInns = items.filter((o) => o.inns.length).length
    console.log(`  宿 ${inns.length} 件中 ${innCount} 件を ${withInns} 温泉地に紐付け`)
  } catch (e) {
    console.warn(`  宿の収集に失敗: ${e.message}`)
  }

  console.log('▶ ジオコーディング (Nominatim)...')
  const missing = await geocodeAll(items)

  items.sort((a, b) => PREFS.indexOf(a.prefecture) - PREFS.indexOf(b.prefecture))
  await writeFile(OUT_FILE, JSON.stringify(items, null, 2))
  console.log(
    `✅ ${OUT_FILE} に ${items.length} 件を書き出し（座標欠損 ${missing} 件 / 宿紐付け ${innCount} 件）`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
