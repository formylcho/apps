<script setup>
import { ref, reactive, computed } from 'vue'
import data from './data/iems.json'
import { enrich, PRICE_BANDS, formatJpy } from './lib/iem.js'
import IemCard from './components/IemCard.vue'

const all = data.iems.map(enrich)
const meta = data.meta

// --- フィルタ用の選択肢（データから動的に生成） ---
const uniq = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'ja'))
const allTypes = ['ダイナミック', 'マルチDD', 'ハイブリッド', 'トライブリッド', '平面駆動', 'BA型']
  .filter((t) => all.some((i) => i.type === t))
// メーカーは収録数の多い順（同数なら名前順）に並べる。
const brandCounts = {}
all.forEach((i) => (brandCounts[i.brand] = (brandCounts[i.brand] || 0) + 1))
const allBrands = [...new Set(all.map((i) => i.brand))]
  .sort((a, b) => brandCounts[b] - brandCounts[a] || a.localeCompare(b, 'ja'))
const allSignatures = uniq(all.map((i) => i.signature))
const allConnectors = uniq(all.map((i) => i.connector))
// タグは出現頻度の高い順に。
const tagCount = {}
all.forEach((i) => (i.tags || []).forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)))
const allTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])

// --- 状態 ---
// Vue 3 の reactive は Set のミューテーション(add/delete/has/size)を
// そのまま追跡するため、フィルタ用の集合はここに集約する。
// （ref を template から関数に渡すと自動アンラップで素の値になり扱いづらい）
const q = ref('')
const brandQuery = ref('')
const sort = ref('price-asc')
const sel = reactive({
  bands: new Set(),
  types: new Set(),
  brands: new Set(),
  sigs: new Set(),
  connectors: new Set(),
  tags: new Set(),
})

function toggle(key, val) {
  const s = sel[key]
  s.has(val) ? s.delete(val) : s.add(val)
}
function clearAll() {
  q.value = ''
  for (const key of Object.keys(sel)) sel[key].clear()
}

const activeCount = computed(() =>
  sel.bands.size + sel.types.size + sel.brands.size +
  sel.sigs.size + sel.connectors.size + sel.tags.size +
  (q.value.trim() ? 1 : 0)
)

// --- 絞り込み ---
const filtered = computed(() => {
  const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  let list = all.filter((i) => {
    if (terms.length && !terms.every((t) => i._haystack.includes(t))) return false
    if (sel.bands.size && !sel.bands.has(i.band.id)) return false
    if (sel.types.size && !sel.types.has(i.type)) return false
    if (sel.brands.size && !sel.brands.has(i.brand)) return false
    if (sel.sigs.size && !sel.sigs.has(i.signature)) return false
    if (sel.connectors.size && !sel.connectors.has(i.connector)) return false
    if (sel.tags.size && ![...sel.tags].every((t) => (i.tags || []).includes(t))) return false
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
const brandCount = (b) => brandCounts[b] || 0

// メーカー名サブ検索。選択中のものは絞り込んでも消えないようにする。
const shownBrands = computed(() => {
  const kw = brandQuery.value.trim().toLowerCase()
  if (!kw) return allBrands
  return allBrands.filter((b) => b.toLowerCase().includes(kw) || sel.brands.has(b))
})
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
          <input type="checkbox" :checked="sel.bands.has(b.id)" @change="toggle('bands', b.id)" />
          <span>{{ b.label }}</span><span class="cnt">{{ bandCount(b.id) }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>メーカー</h2>
        <input v-model="brandQuery" class="search subsearch" type="search"
          placeholder="メーカー名で絞り込み" />
        <div class="scroll-list">
          <label v-for="b in shownBrands" :key="b" class="chk">
            <input type="checkbox" :checked="sel.brands.has(b)" @change="toggle('brands', b)" />
            <span>{{ b }}</span><span class="cnt">{{ brandCount(b) }}</span>
          </label>
          <p v-if="!shownBrands.length" class="no-hit">該当メーカーなし</p>
        </div>
      </div>

      <div class="filter-block">
        <h2>ドライバ型式</h2>
        <label v-for="t in allTypes" :key="t" class="chk">
          <input type="checkbox" :checked="sel.types.has(t)" @change="toggle('types', t)" />
          <span>{{ t }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>音傾向</h2>
        <label v-for="s in allSignatures" :key="s" class="chk">
          <input type="checkbox" :checked="sel.sigs.has(s)" @change="toggle('sigs', s)" />
          <span>{{ s }}</span>
        </label>
      </div>

      <div class="filter-block">
        <h2>特徴タグ</h2>
        <div class="tag-cloud">
          <button v-for="t in allTags" :key="t" class="tag-btn"
            :class="{ on: sel.tags.has(t) }" @click="toggle('tags', t)">
            {{ t }}
          </button>
        </div>
      </div>

      <div class="filter-block">
        <h2>接続端子</h2>
        <label v-for="c in allConnectors" :key="c" class="chk">
          <input type="checkbox" :checked="sel.connectors.has(c)" @change="toggle('connectors', c)" />
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
