#!/usr/bin/env node
/**
 * チャンネル「ふぐみかん」の動画一覧をYouTubeのRSSフィードから取得し、
 * src/data/iems.json の各機種に「実際のレビュー動画URL・投稿日」を
 * 突き合わせて埋め込む補助スクリプト。
 *
 * ねらい:
 *   - スペック/価格などの中身は人手でキュレーションした iems.json を正とする。
 *   - 動画リンクと投稿日だけは、ここで公開フィードから再生成して鮮度を保つ。
 *
 * 使い方:
 *   node scripts/crawl.mjs            # マッチを表示するだけ（dry-run）
 *   node scripts/crawl.mjs --write    # iems.json に video.url / video.date を書き込む
 *
 * 注意:
 *   実行環境からYouTube(www.youtube.com)へHTTPSで到達できる必要がある。
 *   組織のegressポリシー等でブロックされている環境では取得できないため、
 *   その場合は iems.json の video.query（チャンネル内検索リンク）が使われる。
 *   RSSフィードは直近15本のみ。全件を辿るには Data API / スクレイピングが要る。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(__dirname, '../src/data/iems.json')
const CACHE = resolve(__dirname, '.cache')
const WRITE = process.argv.includes('--write')

async function fetchFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 fuguiem-crawler' } })
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`)
  return res.text()
}

// 依存を増やさないため、フィードの簡易パースは正規表現で行う。
function parseFeed(xml) {
  const entries = []
  for (const block of xml.split('<entry>').slice(1)) {
    const id = (block.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1]
    const title = decode((block.match(/<title>(.*?)<\/title>/s) || [])[1] || '')
    const published = (block.match(/<published>(.*?)<\/published>/) || [])[1]
    if (id && title) entries.push({ id, title, date: (published || '').slice(0, 10) })
  }
  return entries
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

const norm = (s) => s.toLowerCase().replace(/[\s\-_/()]/g, '')

// 機種名（brand+model）が動画タイトルに含まれていればマッチとみなす。
function matchVideo(iem, entries) {
  const keys = [
    `${iem.brand}${iem.model}`,
    iem.model,
    iem.video?.query || '',
  ].map(norm).filter((k) => k.length >= 3)
  for (const e of entries) {
    const t = norm(e.title)
    if (keys.some((k) => t.includes(k))) return e
  }
  return null
}

async function main() {
  const json = JSON.parse(await readFile(DATA, 'utf8'))
  let entries = []
  try {
    const xml = await fetchFeed(json.meta.channelId)
    await mkdir(CACHE, { recursive: true })
    await writeFile(resolve(CACHE, 'feed.xml'), xml)
    entries = parseFeed(xml)
    console.log(`フィード取得: ${entries.length} 本の動画`)
  } catch (err) {
    console.error(`フィード取得に失敗: ${err.message}`)
    console.error('（ネットワーク制限等。iems.json は変更しません）')
    process.exit(1)
  }

  let hits = 0
  for (const iem of json.iems) {
    const m = matchVideo(iem, entries)
    if (m) {
      hits++
      const url = `https://www.youtube.com/watch?v=${m.id}`
      console.log(`✓ ${iem.brand} ${iem.model} → ${m.date}  ${m.title}`)
      if (WRITE) {
        iem.video = { ...(iem.video || {}), url, date: m.date.slice(0, 7) }
      }
    }
  }
  console.log(`\nマッチ: ${hits} / ${json.iems.length} 件（RSSは直近15本のみ）`)

  if (WRITE && hits) {
    json.meta.generatedAt = new Date().toISOString().slice(0, 10)
    await writeFile(DATA, JSON.stringify(json, null, 2) + '\n')
    console.log(`\n書き込み完了: ${DATA}`)
  } else if (!WRITE) {
    console.log('\n(dry-run) 書き込むには --write を付けて実行してください。')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
