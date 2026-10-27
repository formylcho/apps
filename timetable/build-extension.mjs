// index.html から Chrome拡張用のパネル（extension/panel.html + panel.js）を作る。
// 拡張のページはインラインの <script> を実行できないので、スクリプトだけ別ファイルに分ける。
// 使い方: node build-extension.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const m = html.match(/<script>\n([\s\S]*?)<\/script>/);
if (!m) throw new Error('index.html に <script> が見つかりません');

writeFileSync(new URL('./extension/panel.js', import.meta.url), m[1]);
writeFileSync(new URL('./extension/panel.html', import.meta.url), html.replace(m[0], '<script src="panel.js"></script>'));
console.log('extension/panel.html, extension/panel.js を更新しました');
