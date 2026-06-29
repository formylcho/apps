<script setup>
import { ref, computed } from 'vue'
import data from './data/iems.json'
import { enrich, PRICE_BANDS, formatJpy } from './lib/iem.js'
import IemCard from './components/IemCard.vue'

const all = data.iems.map(enrich)
const meta = data.meta

// --- フィルタ用の選択肢（データから動的に生成） ---
const uniq = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'ja'))
const allTypes = ['ダイナミック', 'マルチDD', 'ハイブリッド', 'トライブリッド', '平面駆動', 'BA型']
  .filter((t) => all.some((i) => i.type === t))
const allBrands = uniq(all.map((i) => i.brand))
const allSignatures = uniq(all.map((i) => i.signature))
const allConnectors = uniq(all.map((i) => i.connector))
// タグは出現頻度の高い順に。
const tagCount = {}
all.forEach((i) => (i.tags || []).forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)))
const allTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])

// --- 状態 ---
const q = ref('')
const selBands = ref(new Set())
const selTypes = ref(new Set())
const selBrands = ref(new Set())
const selSigs = ref(new Set())
const selConnectors = ref(new Set())
const selTags = ref(new Set())
const sort = ref('price-asc')

function toggle(set, val) {
  const s = set.value
  s.has(val) ? s.delete(val) : s.add(val)
  set.value = new Set(s)
}
function clearAll() {
  q.value = ''
  for (const s of [selBands, selTypes, selBrands, selSigs, selConnectors, selTags]) s.value = new Set()
}

const activeCount = computed(() =>
  selBands.value.size + selTypes.value.size + selBrands.value.size +
  selSigs.value.size + selConnectors.value.size + selTags.value.size +
  (q.value.trim() ? 1 : 0)
)

// --- 絞り込み ---
const filtered = computed(() => {
  const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  let list = all.filter((i) => {
    if (terms.length && !terms.every((t) => i._haystack.includes(t))) return false
    if (selBands.value.size && !selBands.value.has(i.band.id)) return false
    if (selTypes.value.size && !selTypes.value.has(i.type)) return false
    if (selBrands.value.size && !selBrands.value.has(i.brand)) return false
    if (selSigs.value.size && !selSigs.value.has(i.signature)) return false
    if (selConnectors.value.size && !selConnectors.value.has(i.connector)) return false
    if (selTags.value.size && ![...selTags.value].every((t) => (i.tags || []).includes(t))) return false
    return true
  })
  const cmp = {
    'price-asc': (a, b) => a.priceJpy - b.priceJpy,
    'price-desc': (a, b) => b.priceJpy - a.priceJpy,
    'year-desc': (a, b) => b.year - a.year || a.priceJpy - b.priceJpy,
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'ja'),
    'drivers-desc': (a, b) => b.drivers_total - a.drivers_total || a.priceJpy - b.priceJpy,
  }[sort.value]
  return [...list].sort(cmp)
})

const bandCount = (id) => all.filter((i) => i.band.id === id).length
</script>

<template>
  <div class="layout">
    <!-- サイドバー（フィルタ） -->
    <aside class="sidebar">
      <div class="brand-head">
        <h1>🎧 ふぐみかん<br />IEMデータベース</h1>
        <p class="tagline">
          YouTubeチャンネル
          <a :href="meta.channelUrl" target="_blank" rel="noopener">ふぐみかん</a>
          で紹介された中華イヤホンを、価格帯・スペック・特徴で絞り込み。
        </p>
      </div>

      <div class="filter-block">
        <input v-model="q" class="search" type="search"
          placeholder="🔍 機種名・特徴・端子などで検索" />
      </div>

      <div class="filter-block">
        <h2>価格帯</h2>
        <label v-for="b in PRICE_BANDS" :key="b.id" class="chk">
          <input type="checkbox" :checked="selBands.has(b.id)" @change="toggle(selBands, b.id)" />
          <span>{{ b.label }}</span><span class="cnt">{{ bandCount(b.id) }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>ドライバ型式</h2>
        <label v-for="t in allTypes" :key="t" class="chk">
          <input type="checkbox" :checked="selTypes.has(t)" @change="toggle(selTypes, t)" />
          <span>{{ t }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>音傾向</h2>
        <label v-for="s in allSignatures" :key="s" class="chk">
          <input type="checkbox" :checked="selSigs.has(s)" @change="toggle(selSigs, s)" />
          <span>{{ s }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>特徴タグ</h2>
        <div class="tag-cloud">
          <button v-for="t in allTags" :key="t" class="tag-btn"
            :class="{ on: selTags.has(t) }" @click="toggle(selTags, t)">
            {{ t }}
          </button>
        </div>
      </div>

      <div class="filter-block">
        <h2>ブランド</h2>
        <label v-for="b in allBrands" :key="b" class="chk">
          <input type="checkbox" :checked="selBrands.has(b)" @change="toggle(selBrands, b)" />
          <span>{{ b }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>接続端子</h2>
        <label v-for="c in allConnectors" :key="c" class="chk">
          <input type="checkbox" :checked="selConnectors.has(c)" @change="toggle(selConnectors, c)" />
          <span>{{ c }}</span>
        </label>
      </div>

      <p class="disclaimer">{{ meta.note }}</p>
    </aside>

    <!-- メイン -->
    <main class="main">
      <div class="toolbar">
        <div class="result-info">
          <strong>{{ filtered.length }}</strong> 件
          <span v-if="activeCount" class="muted">/ 全{{ all.length }}件中</span>
          <button v-if="activeCount" class="clear" @click="clearAll">
            条件クリア（{{ activeCount }}）
          </button>
        </div>
        <label class="sort">
          並び替え:
          <select v-model="sort">
            <option value="price-asc">価格が安い順</option>
            <option value="price-desc">価格が高い順</option>
            <option value="year-desc">新しい順</option>
            <option value="drivers-desc">ドライバ数が多い順</option>
            <option value="name-asc">名前順</option>
          </select>
        </label>
      </div>

      <div v-if="filtered.length" class="grid">
        <IemCard v-for="iem in filtered" :key="iem.id" :iem="iem" />
      </div>
      <div v-else class="empty">
        <p>😶 条件に合うイヤホンが見つかりませんでした。</p>
        <button class="clear" @click="clearAll">条件をクリア</button>
      </div>

      <footer class="footer">
        データ生成: {{ meta.generatedAt }} ／ 出典:
        <a :href="meta.channelUrl" target="_blank" rel="noopener">{{ meta.source }}</a>
        <br />本サイトは非公式のファンメイドDBです。価格は当時のおおよその実勢値です。
      </footer>
    </main>
  </div>
</template>
