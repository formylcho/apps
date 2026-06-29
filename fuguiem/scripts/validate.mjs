#!/usr/bin/env node
/**
 * iems.json の整合性チェック。CIや手元での簡易検査用。
 *   node scripts/validate.mjs
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const json = JSON.parse(await readFile(resolve(__dirname, '../src/data/iems.json'), 'utf8'))

const REQUIRED = ['id', 'brand', 'model', 'year', 'priceJpy', 'drivers',
  'impedance', 'sensitivity', 'fr', 'connector', 'shell', 'signature', 'tags', 'note', 'video']
const errors = []
const ids = new Set()

json.iems.forEach((iem, i) => {
  const at = `iems[${i}] ${iem.brand || '?'} ${iem.model || '?'}`
  for (const k of REQUIRED) if (iem[k] === undefined) errors.push(`${at}: 必須項目 "${k}" がありません`)
  if (ids.has(iem.id)) errors.push(`${at}: id "${iem.id}" が重複`)
  ids.add(iem.id)
  if (typeof iem.priceJpy !== 'number' || iem.priceJpy <= 0) errors.push(`${at}: priceJpy が不正`)
  const d = iem.drivers || {}
  if (!((d.dd || 0) + (d.ba || 0) + (d.planar || 0) + (d.est || 0) > 0))
    errors.push(`${at}: ドライバ構成が0`)
  if (!Array.isArray(iem.tags) || iem.tags.length === 0) errors.push(`${at}: tags が空`)
  if (!iem.video || (!iem.video.query && !iem.video.url)) errors.push(`${at}: video.query/url が無い`)
})

if (json.meta.count !== json.iems.length)
  console.warn(`⚠ meta.count(${json.meta.count}) と実件数(${json.iems.length})が不一致`)

if (errors.length) {
  console.error(`✗ ${errors.length} 件のエラー:`)
  errors.forEach((e) => console.error('  - ' + e))
  process.exit(1)
}
console.log(`✓ ${json.iems.length} 件すべて検証OK（ブランド ${new Set(json.iems.map(i => i.brand)).size} 種）`)
