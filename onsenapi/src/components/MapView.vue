<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  onsen: { type: Array, required: true },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['select'])

const mapEl = ref(null)
let map = null
const markers = new Map() // id -> marker

function pinIcon(active) {
  return L.divIcon({
    className: '',
    html: `<div class="onsen-pin${active ? ' is-active' : ''}"><span>♨</span></div>`,
    iconSize: active ? [38, 38] : [30, 30],
    iconAnchor: active ? [19, 38] : [15, 30],
  })
}

onMounted(() => {
  map = L.map(mapEl.value, { zoomControl: true }).setView([37.8, 137.5], 5)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map)
  renderMarkers()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

// 選択時はラベルを常時表示、非選択時はホバー表示に戻す
function rebindLabel(marker, permanent) {
  const name = marker.options.title
  marker.unbindTooltip()
  marker.bindTooltip(name, {
    permanent,
    direction: 'right',
    offset: [12, -10],
    className: 'onsen-label',
  })
  if (permanent) marker.openTooltip()
}

function renderMarkers() {
  if (!map) return
  markers.forEach((m) => m.remove())
  markers.clear()
  for (const o of props.onsen) {
    if (o.lat == null || o.lon == null) continue
    const marker = L.marker([o.lat, o.lon], {
      icon: pinIcon(o.id === props.selectedId),
      title: o.name,
    })
    marker.bindTooltip(o.name, {
      permanent: o.id === props.selectedId,
      direction: 'right',
      offset: [12, -10],
      className: 'onsen-label',
    })
    marker.on('click', () => emit('select', o.id))
    marker.addTo(map)
    markers.set(o.id, marker)
  }
}

watch(() => props.onsen, renderMarkers, { deep: false })

watch(
  () => props.selectedId,
  (id, prev) => {
    if (prev && markers.has(prev)) {
      const pm = markers.get(prev)
      pm.setIcon(pinIcon(false))
      rebindLabel(pm, false)
    }
    if (id && markers.has(id)) {
      const m = markers.get(id)
      m.setIcon(pinIcon(true))
      rebindLabel(m, true)
      const o = props.onsen.find((x) => x.id === id)
      if (o && o.lat != null) map.flyTo([o.lat, o.lon], Math.max(map.getZoom(), 8), { duration: 0.6 })
    }
  }
)

defineExpose({
  focus(id) {
    const o = props.onsen.find((x) => x.id === id)
    if (o && o.lat != null) map.flyTo([o.lat, o.lon], 9)
  },
})
</script>

<template>
  <div ref="mapEl" class="map"></div>
</template>

<style scoped>
.map {
  height: 100%;
  width: 100%;
}
</style>
