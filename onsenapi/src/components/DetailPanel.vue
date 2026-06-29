<script setup>
import TransitSearch from './TransitSearch.vue'
import { proxiedImage } from '../utils/img.js'

defineProps({
  onsen: { type: Object, default: null },
})
defineEmits(['close'])
</script>

<template>
  <aside v-if="onsen" class="detail">
    <button class="close" @click="$emit('close')" aria-label="閉じる">×</button>

    <header class="head">
      <div class="pref">{{ onsen.prefecture }}</div>
      <h2>{{ onsen.name }}</h2>
      <div v-if="onsen.kana" class="kana">{{ onsen.kana }}</div>
      <p v-if="onsen.catch" class="catch">{{ onsen.catch }}</p>
    </header>

    <section v-if="onsen.images && onsen.images.length" class="block gallery-block">
      <div class="gallery">
        <a
          v-for="(img, i) in onsen.images"
          :key="i"
          :href="proxiedImage(img.full)"
          target="_blank"
          rel="noopener"
          class="gallery-item"
        >
          <img :src="proxiedImage(img.thumb)" :alt="`${onsen.name}の写真${i + 1}`" loading="lazy" />
        </a>
      </div>
    </section>

    <section v-if="onsen.summary" class="block">
      <h3>概要</h3>
      <p class="multiline">{{ onsen.summary }}</p>
    </section>

    <section v-if="onsen.springQuality" class="block">
      <h3>泉質</h3>
      <p class="multiline">{{ onsen.springQuality }}</p>
    </section>

    <section v-if="onsen.effects" class="block">
      <h3>効能・適応症</h3>
      <p class="multiline">{{ onsen.effects }}</p>
    </section>

    <section v-if="onsen.highlight" class="block">
      <h3>見どころ</h3>
      <p class="multiline">{{ onsen.highlight }}</p>
    </section>

    <section v-if="onsen.capacity || (onsen.inns && onsen.inns.length)" class="block">
      <h3>温泉宿</h3>
      <p v-if="onsen.capacity" class="capacity">収容力: {{ onsen.capacity }}</p>

      <ul v-if="onsen.inns && onsen.inns.length" class="inns">
        <li v-for="inn in onsen.inns" :key="inn.fid" class="inn">
          <img v-if="inn.image" :src="proxiedImage(inn.image)" :alt="inn.name" class="inn-thumb" loading="lazy" />
          <div class="inn-body">
            <div class="inn-name">{{ inn.name }}</div>
            <div class="inn-meta">
              <span v-if="inn.spring">♨ {{ inn.spring }}</span>
              <span v-if="inn.rooms">・{{ inn.rooms }}</span>
            </div>
            <div class="inn-links">
              <a v-if="inn.officialUrl" :href="inn.officialUrl" target="_blank" rel="noopener">公式サイト</a>
              <a :href="inn.detailUrl" target="_blank" rel="noopener">協会の宿情報</a>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="inns-note">個別の宿情報は下記の問い合わせ先（観光協会等）をご覧ください。</p>
    </section>

    <section v-if="onsen.access" class="block">
      <h3>アクセス</h3>
      <p class="multiline">{{ onsen.access }}</p>
    </section>

    <section v-if="onsen.contacts && onsen.contacts.length" class="block">
      <h3>問い合わせ先</h3>
      <ul class="contacts">
        <li v-for="(c, i) in onsen.contacts" :key="i">
          <a v-if="c.url" :href="c.url" target="_blank" rel="noopener">{{ c.label }}</a>
          <span v-else-if="c.tel">📞 {{ c.tel }}</span>
        </li>
      </ul>
    </section>

    <p class="source">
      出典:
      <a :href="onsen.sourceUrl" target="_blank" rel="noopener">日本温泉協会</a>
    </p>

    <section class="block transit">
      <h3>🚃 ここまでの乗換案内</h3>
      <TransitSearch :onsen="onsen" />
    </section>
  </aside>
</template>

<style scoped>
.detail {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--panel);
  padding: 18px 18px 40px;
}
.close {
  position: absolute;
  top: 10px;
  right: 12px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 18px;
  line-height: 1;
  color: var(--muted);
}
.head {
  border-bottom: 2px solid var(--accent-soft);
  padding-bottom: 12px;
  margin-bottom: 8px;
}
.pref {
  display: inline-block;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}
h2 {
  margin: 8px 0 2px;
  font-size: 22px;
}
.kana {
  color: var(--muted);
  font-size: 13px;
}
.catch {
  color: var(--accent);
  font-weight: 600;
  margin: 8px 0 0;
}
.block {
  margin-top: 16px;
}
.block h3 {
  font-size: 14px;
  margin: 0 0 6px;
  color: var(--ink);
  border-left: 4px solid var(--accent);
  padding-left: 8px;
}
.multiline {
  white-space: pre-line;
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
}
.gallery-block {
  margin-top: 12px;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.gallery-item {
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
}
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.gallery-item:hover img {
  transform: scale(1.06);
}
.capacity {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 8px;
}
.inns {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.inn {
  display: flex;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px;
}
.inn-thumb {
  width: 84px;
  height: 70px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.inn-body {
  min-width: 0;
}
.inn-name {
  font-weight: 700;
  font-size: 14px;
}
.inn-meta {
  font-size: 12px;
  color: var(--muted);
  margin: 2px 0 4px;
}
.inn-links {
  display: flex;
  gap: 10px;
  font-size: 12px;
}
.inns-note {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}
.contacts {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
}
.contacts li {
  margin: 2px 0;
}
.source {
  margin-top: 16px;
  font-size: 12px;
  color: var(--muted);
}
.transit {
  border-top: 1px dashed var(--line);
  padding-top: 16px;
}
</style>
