<script setup>
import TransitSearch from './TransitSearch.vue'

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

    <section v-if="onsen.capacity" class="block">
      <h3>温泉宿（収容力）</h3>
      <p class="multiline">{{ onsen.capacity }}</p>
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
