<script setup>
import { videoUrl, formatJpy } from '../lib/iem.js'

const props = defineProps({ iem: Object })

const TYPE_CLASS = {
  'ダイナミック': 'dd',
  'マルチDD': 'dd',
  'BA型': 'ba',
  'ハイブリッド': 'hy',
  'トライブリッド': 'tri',
  '平面駆動': 'planar',
}
</script>

<template>
  <article class="card">
    <header class="card-head">
      <div>
        <div class="brand">{{ iem.brand }}</div>
        <h3 class="model">{{ iem.model }}</h3>
      </div>
      <div class="price">
        {{ formatJpy(iem.priceJpy) }}
        <span class="price-sub" v-if="iem.priceUsd">${{ iem.priceUsd }}</span>
      </div>
    </header>

    <div class="badges">
      <span class="badge" :class="TYPE_CLASS[iem.type] || 'dd'">{{ iem.type }}</span>
      <span class="badge ghost">{{ iem.config }}</span>
      <span class="badge ghost">{{ iem.year }}年</span>
    </div>

    <p class="sig">🎚 {{ iem.signature }}</p>
    <p class="note">{{ iem.note }}</p>

    <dl class="specs">
      <div><dt>ドライバ</dt><dd>{{ iem.driverDetail }}</dd></div>
      <div><dt>インピーダンス</dt><dd>{{ iem.impedance }}Ω</dd></div>
      <div><dt>能率</dt><dd>{{ iem.sensitivity }}dB</dd></div>
      <div><dt>再生周波数</dt><dd>{{ iem.fr }}</dd></div>
      <div><dt>端子</dt><dd>{{ iem.connector }}</dd></div>
      <div><dt>筐体</dt><dd>{{ iem.shell }}</dd></div>
    </dl>

    <div class="tags">
      <span v-for="t in iem.tags" :key="t" class="tag">#{{ t }}</span>
    </div>

    <a class="watch" :href="videoUrl(iem)" target="_blank" rel="noopener">
      ▶ ふぐみかんの動画を見る
    </a>
  </article>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .28);
}
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.brand { font-size: .76rem; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; }
.model { margin: 2px 0 0; font-size: 1.18rem; line-height: 1.2; }
.price { text-align: right; font-weight: 700; font-size: 1.18rem; color: var(--accent); white-space: nowrap; }
.price-sub { display: block; font-size: .72rem; font-weight: 500; color: var(--muted); }
.badges { display: flex; flex-wrap: wrap; gap: 6px; }
.badge { font-size: .72rem; padding: 2px 9px; border-radius: 999px; font-weight: 600; color: #fff; }
.badge.dd { background: #2563eb; }
.badge.ba { background: #7c3aed; }
.badge.hy { background: #0891b2; }
.badge.tri { background: #db2777; }
.badge.planar { background: #ea580c; }
.badge.ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
.sig { margin: 0; font-size: .9rem; color: var(--text); }
.note { margin: 0; font-size: .86rem; color: var(--muted); line-height: 1.55; }
.specs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; margin: 4px 0 0; font-size: .8rem; }
.specs > div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed var(--border); padding: 3px 0; }
.specs dt { color: var(--muted); white-space: nowrap; }
.specs dd { margin: 0; text-align: right; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { font-size: .72rem; color: var(--accent); background: var(--accent-soft); padding: 2px 7px; border-radius: 6px; }
.watch {
  margin-top: auto; text-align: center; text-decoration: none;
  background: var(--accent); color: #fff; font-weight: 600; font-size: .88rem;
  padding: 9px; border-radius: 9px; transition: filter .12s ease;
}
.watch:hover { filter: brightness(1.1); }
</style>
