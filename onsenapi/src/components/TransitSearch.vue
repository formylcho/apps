<script setup>
import { ref, watch, computed } from 'vue'
import {
  suggestPlaces,
  planRoute,
  secsToHHMM,
  formatDuration,
  journeyModes,
} from '../api/transit.js'

const props = defineProps({
  onsen: { type: Object, required: true },
})

const query = ref('')
const suggestions = ref([])
const origin = ref(null) // {name, endpoint, lat, lon}
const date = ref('')
const time = ref('')
const searchType = ref('departure') // departure | arrival | first | last
const count = ref(4) // 表示する経路候補数
const useShinkansen = ref(true) // 新幹線を使う
const useExpress = ref(true) // 在来線特急を使う
const loading = ref(false)
const locating = ref(false)
const error = ref('')
const journeys = ref(null)

const SEARCH_TYPES = [
  { value: 'departure', label: '出発' },
  { value: 'arrival', label: '到着' },
  { value: 'first', label: '始発' },
  { value: 'last', label: '終電' },
]

// 始発・終電は時刻指定不要（日付のみ）
const needsTime = computed(() => searchType.value === 'departure' || searchType.value === 'arrival')

let suggestTimer = null

watch(
  () => props.onsen?.id,
  () => {
    // 温泉地が変わったら結果のみリセット（出発地は保持）
    journeys.value = null
    error.value = ''
  }
)

watch(query, (q) => {
  if (origin.value && q === origin.value.name) return
  origin.value = null
  clearTimeout(suggestTimer)
  if (!q || q.trim().length < 1) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      suggestions.value = await suggestPlaces(q, 8)
    } catch {
      suggestions.value = []
    }
  }, 250)
})

function pick(p) {
  origin.value = p
  query.value = p.name
  suggestions.value = []
}

// 現在地（GPS）を出発地に設定
function useCurrentLocation() {
  if (!navigator.geolocation) {
    error.value = 'この端末では現在地を取得できません。'
    return
  }
  locating.value = true
  error.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords
      origin.value = {
        name: '現在地',
        endpoint: `geo:${latitude.toFixed(5)},${longitude.toFixed(5)}`,
        lat: latitude,
        lon: longitude,
      }
      query.value = '現在地'
      suggestions.value = []
      locating.value = false
    },
    () => {
      error.value = '現在地を取得できませんでした。位置情報の許可をご確認ください。'
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

const destGeo = computed(() => {
  const o = props.onsen
  if (o?.lat == null || o?.lon == null) return null
  return `geo:${o.lat},${o.lon}`
})

// 取得した経路に新幹線/特急の使用有無を付与し、トグルで絞り込む
const annotated = computed(() =>
  (journeys.value || []).map((j) => ({ journey: j, modes: journeyModes(j) }))
)
const displayJourneys = computed(() =>
  annotated.value.filter(({ modes }) => {
    if (!useShinkansen.value && modes.shinkansen) return false
    if (!useExpress.value && modes.express) return false
    return true
  })
)
const filteredOut = computed(() => annotated.value.length - displayJourneys.value.length)

async function search() {
  error.value = ''
  journeys.value = null
  if (!origin.value) {
    error.value = '出発地を候補から選んでください。'
    return
  }
  if (!destGeo.value) {
    error.value = 'この温泉地は座標が未登録のため検索できません。'
    return
  }
  loading.value = true
  try {
    // 新幹線/特急フィルタ時は絞り込み後に件数を確保するため多めに取得
    const filtering = !useShinkansen.value || !useExpress.value
    const opts = {
      type: searchType.value,
      numItineraries: filtering ? Math.min(count.value + 4, 10) : count.value,
    }
    if (date.value) opts.date = date.value.replace(/-/g, '')
    if (needsTime.value && time.value) opts.time = time.value
    const data = await planRoute(origin.value.endpoint, destGeo.value, opts)
    journeys.value = data.journeys || []
  } catch (e) {
    error.value = e.message || '検索に失敗しました。'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="transit">
    <label class="field">
      <span>出発地</span>
      <div class="origin-row">
        <input
          v-model="query"
          type="text"
          placeholder="駅・施設・住所を入力（例: 東京）"
          autocomplete="off"
        />
        <button
          type="button"
          class="locate"
          :disabled="locating"
          title="現在地から出発"
          @click="useCurrentLocation"
        >
          {{ locating ? '取得中…' : '📍現在地' }}
        </button>
      </div>
    </label>
    <ul v-if="suggestions.length" class="suggest">
      <li v-for="p in suggestions" :key="p.id" @click="pick(p)">
        <strong>{{ p.name }}</strong>
        <small v-if="p.description"> {{ p.description }}</small>
      </li>
    </ul>

    <div class="field">
      <span>検索条件</span>
      <div class="segmented">
        <button
          v-for="t in SEARCH_TYPES"
          :key="t.value"
          type="button"
          :class="{ on: searchType === t.value }"
          @click="searchType = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="row">
      <label class="field small">
        <span>日付</span>
        <input v-model="date" type="date" />
      </label>
      <label class="field small">
        <span>{{ searchType === 'arrival' ? '到着時刻' : '出発時刻' }}</span>
        <input v-model="time" type="time" :disabled="!needsTime" />
      </label>
      <label class="field small count">
        <span>表示数</span>
        <select v-model.number="count">
          <option :value="2">2件</option>
          <option :value="4">4件</option>
          <option :value="6">6件</option>
        </select>
      </label>
    </div>
    <p class="hint">
      <template v-if="searchType === 'first'">始発列車で検索します（時刻指定は無効）。</template>
      <template v-else-if="searchType === 'last'">終電（最終列車）で検索します（時刻指定は無効）。</template>
      <template v-else-if="searchType === 'arrival'">指定時刻までに<strong>到着</strong>する経路を検索します。</template>
      <template v-else>指定時刻に<strong>出発</strong>する経路を検索します。空欄なら現在時刻。</template>
    </p>

    <div class="field">
      <span>利用する列車</span>
      <div class="toggles">
        <label><input v-model="useShinkansen" type="checkbox" /> 新幹線</label>
        <label><input v-model="useExpress" type="checkbox" /> 特急</label>
      </div>
    </div>

    <div class="dest">→ <strong>{{ onsen.name }}</strong></div>

    <button class="go" :disabled="loading" @click="search">
      {{ loading ? '検索中…' : '乗換案内を検索' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <p class="fare-note">※ 料金は本乗換案内サービスでは提供されていないため表示できません。</p>

    <div v-if="journeys" class="results">
      <p v-if="!displayJourneys.length" class="empty">
        条件に合う経路が見つかりませんでした。<br />
        <template v-if="filteredOut > 0">新幹線・特急の利用を許可すると見つかる場合があります。</template>
      </p>
      <p v-else-if="filteredOut > 0" class="note">
        新幹線/特急を含む {{ filteredOut }} 件を非表示にしています。
      </p>
      <article v-for="({ journey: j, modes }, i) in displayJourneys" :key="i" class="journey">
        <header>
          <span class="time">{{ secsToHHMM(j.departureSecs) }} → {{ secsToHHMM(j.arrivalSecs) }}</span>
          <span class="meta">{{ formatDuration(j.durationSecs) }} ・ 乗換{{ j.transferCount }}回</span>
        </header>
        <div v-if="modes.shinkansen || modes.express" class="badges">
          <span v-if="modes.shinkansen" class="badge shinkansen">新幹線</span>
          <span v-if="modes.express" class="badge express">特急</span>
        </div>
        <ol class="legs">
          <li v-for="(leg, k) in j.legs" :key="k" :class="leg.kind">
            <span class="leg-time">{{ secsToHHMM(leg.departureSecs) }}</span>
            <span class="leg-body">
              <template v-if="leg.kind === 'walk'">🚶 徒歩</template>
              <template v-else>
                <span class="route" :style="leg.color ? { background: '#' + leg.color } : {}">
                  {{ leg.routeName || leg.mode }}
                </span>
                <span v-if="leg.headsign" class="headsign">{{ leg.headsign }}</span>
              </template>
              <span class="stops">{{ leg.from?.name }} → {{ leg.to?.name }}</span>
            </span>
          </li>
        </ol>
      </article>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: block;
  margin-bottom: 8px;
}
.field span {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 2px;
}
.field input,
.field select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}
.field input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}
.origin-row {
  display: flex;
  gap: 6px;
}
.origin-row input {
  flex: 1;
  min-width: 0;
}
.locate {
  flex-shrink: 0;
  padding: 8px 10px;
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.locate:disabled {
  opacity: 0.6;
}
.segmented {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.segmented button {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: #fff;
  font-size: 14px;
  color: var(--ink);
  border-left: 1px solid var(--line);
}
.segmented button:first-child {
  border-left: none;
}
.segmented button.on {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}
.row {
  display: flex;
  gap: 8px;
}
.field.small {
  flex: 1;
}
.field.count {
  flex: 0 0 72px;
}
.hint {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 0;
}
.toggles {
  display: flex;
  gap: 16px;
}
.toggles label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}
.fare-note {
  font-size: 11px;
  color: var(--muted);
  margin: 8px 0 0;
}
.note {
  font-size: 12px;
  color: var(--accent);
  margin: 0 0 8px;
}
.badges {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: #fff;
}
.badge.shinkansen {
  background: #1d4ed8;
}
.badge.express {
  background: #ea580c;
}
.suggest {
  list-style: none;
  margin: -4px 0 8px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
}
.suggest li {
  padding: 7px 10px;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;
}
.suggest li:hover {
  background: var(--accent-soft);
}
.suggest small {
  color: var(--muted);
}
.dest {
  font-size: 14px;
  margin: 6px 0 10px;
  color: #334155;
}
.go {
  width: 100%;
  padding: 11px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
}
.go:disabled {
  opacity: 0.6;
}
.error {
  color: #b91c1c;
  font-size: 13px;
}
.results {
  margin-top: 14px;
}
.empty {
  color: var(--muted);
  font-size: 14px;
}
.journey {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.journey > header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.journey .time {
  font-weight: 700;
  font-size: 15px;
}
.journey .meta {
  font-size: 12px;
  color: var(--muted);
}
.legs {
  list-style: none;
  margin: 0;
  padding: 0;
}
.legs li {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  border-left: 2px solid var(--line);
  padding-left: 10px;
  margin-left: 4px;
}
.legs li.walk {
  color: var(--muted);
}
.leg-time {
  min-width: 44px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.leg-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.route {
  background: #475569;
  color: #fff;
  padding: 1px 7px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
}
.headsign {
  font-size: 12px;
  color: #334155;
}
.stops {
  flex-basis: 100%;
  color: #475569;
}
</style>
