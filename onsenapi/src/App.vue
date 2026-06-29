<script setup>
import { ref, computed } from 'vue'
import MapView from './components/MapView.vue'
import DetailPanel from './components/DetailPanel.vue'
import onsenData from './data/onsen.json'

const onsen = ref(onsenData)
const selectedId = ref(null)
const search = ref('')
const prefFilter = ref('')

const prefectures = computed(() => [...new Set(onsen.value.map((o) => o.prefecture).filter(Boolean))])

const filtered = computed(() =>
  onsen.value.filter((o) => {
    if (prefFilter.value && o.prefecture !== prefFilter.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      return (
        (o.name || '').toLowerCase().includes(q) ||
        (o.kana || '').toLowerCase().includes(q) ||
        (o.prefecture || '').includes(search.value)
      )
    }
    return true
  })
)

const selected = computed(() => onsen.value.find((o) => o.id === selectedId.value) || null)

function select(id) {
  selectedId.value = id
}
</script>

<template>
  <div class="layout">
    <!-- 左サイドバー: 一覧・検索 -->
    <div class="sidebar">
      <div class="brand">
        <h1>♨ 国民保養温泉地マップ</h1>
        <p>全{{ onsen.length }}か所。ピンを押すと詳細と乗換案内が見られます。</p>
      </div>
      <div class="filters">
        <input v-model="search" type="search" placeholder="温泉地名・都道府県で検索" />
        <select v-model="prefFilter">
          <option value="">すべての都道府県</option>
          <option v-for="p in prefectures" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <ul class="list">
        <li
          v-for="o in filtered"
          :key="o.id"
          :class="{ active: o.id === selectedId, nogeo: o.lat == null }"
          @click="select(o.id)"
        >
          <span class="li-name">{{ o.name }}</span>
          <span class="li-pref">{{ o.prefecture }}</span>
        </li>
      </ul>
    </div>

    <!-- 中央: 地図 -->
    <div class="map-wrap">
      <MapView :onsen="filtered" :selected-id="selectedId" @select="select" />
    </div>

    <!-- モバイル: パネル表示中の地図側オーバーレイ -->
    <div v-if="selected" class="scrim" @click="selectedId = null"></div>

    <!-- 右(モバイルは全画面): 詳細パネル -->
    <div v-if="selected" class="panel-wrap">
      <DetailPanel :onsen="selected" @close="selectedId = null" />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100%;
}
.sidebar {
  background: var(--bg);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.brand {
  padding: 16px 16px 8px;
}
.brand h1 {
  font-size: 17px;
  margin: 0 0 4px;
}
.brand p {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}
.filters {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filters input,
.filters select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 14px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid #1e293b;
  font-size: 14px;
}
.list li:hover {
  background: #1e293b;
}
.list li.active {
  background: var(--accent);
  color: #fff;
}
.list li.nogeo .li-name::after {
  content: ' (位置情報なし)';
  font-size: 10px;
  color: #f59e0b;
}
.li-pref {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.list li.active .li-pref {
  color: #ffe4e6;
}
.map-wrap {
  position: relative;
  min-width: 0;
}
/* 詳細パネル。resting state は transform 無し（= 正しい位置）。
   スライドインは animation の forwards で行い、再生されなくても位置は崩れない。 */
.panel-wrap {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 92vw;
  height: 100%;
  background: var(--panel);
  box-shadow: var(--shadow);
  z-index: 1500;
}
/* デスクトップでは地図クリック遮蔽は不要 */
.scrim {
  display: none;
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .sidebar {
    max-height: 40vh;
  }
  /* モバイルは全画面 */
  .panel-wrap {
    width: 100%;
    max-width: 100%;
  }
  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    z-index: 1400;
  }
}
</style>
