(() => {
  'use strict';
  const KEY = 'timetable-v1';
  const DAYS = ['月', '火', '水', '木', '金', '土'];
  const PERIODS = [['09:00', '10:30'], ['10:40', '12:10'], ['13:00', '14:30'], ['14:40', '16:10'], ['16:20', '17:50'], ['18:00', '19:30']];
  const COLORS = ['blue', 'red', 'yellow', 'green', 'purple', 'gray'];

  // 初期状態：授業なし。学期は今日の日付から決める（4〜9月=1学期、10〜3月=2学期）
  const seed = () => {
    const d = new Date();
    const m = d.getMonth() + 1;
    const id = `${m <= 3 ? d.getFullYear() - 1 : d.getFullYear()}-${m >= 4 && m <= 9 ? 1 : 2}`;
    return { current: id, terms: { [id]: { cells: {} } } };
  };

  const valid = (s) => s && typeof s === 'object' && s.terms && typeof s.terms === 'object' && s.terms[s.current];
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!valid(state)) state = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 保存できなくても表示は続ける */ } };

  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  const cells = () => state.terms[state.current].cells;
  const termLabel = (id) => { const [y, n] = id.split('-'); return `${y}年 ${n}学期`; };

  // http/https だけを通す。スキームなしは https:// を補う
  const normalizeUrl = (raw) => {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
    } catch { return ''; }
  };

  const nowSlot = () => {
    const d = new Date();
    const day = d.getDay() - 1; // 月=0 … 土=5、日=-1
    const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return { day, period: PERIODS.findIndex(([a, b]) => hm >= a && hm <= b) };
  };

  // ---- タブ（時間割 / 編集）----
  let editing = false;
  const setMode = (on) => {
    editing = on;
    $('tabView').setAttribute('aria-selected', String(!on));
    $('tabEdit').setAttribute('aria-selected', String(on));
    render();
  };
  $('tabView').onclick = () => setMode(false);
  $('tabEdit').onclick = () => setMode(true);

  let toastTimer;
  const toast = (msg) => {
    $('toast').textContent = msg;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  };

  // 時間割タブでのタップ：リンク1本ならそのまま開く。複数あるときだけ選ばせる
  // Chrome拡張（サイドパネル）の中では、いま開いているタブをそのURLへ進める。Webでは新しいタブで開く
  const inExtension = typeof chrome !== 'undefined' && !!(chrome.tabs && chrome.tabs.update);
  const openUrl = (url) => {
    if (inExtension) chrome.tabs.update({ url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  function go(key) {
    const { links } = cells()[key];
    if (!links.length) toast('URLが未登録です。「編集」タブから登録できます');
    else if (links.length === 1) openUrl(links[0].url);
    else openView(key);
  }

  function render() {
    $('termTitle').textContent = termLabel(state.current);
    document.title = `時間割 — ${termLabel(state.current)}`;
    const grid = $('grid');
    grid.classList.toggle('editing', editing);
    $('emptyHint').hidden = editing || Object.keys(cells()).length > 0;
    const { day: today, period: nowP } = nowSlot();
    grid.replaceChildren(el('div'));
    DAYS.forEach((d, i) => grid.append(el('div', { className: 'dow' + (i === today ? ' today' : '') }, el('span', { textContent: d }))));
    PERIODS.forEach(([from, to], p) => {
      grid.append(el('div', { className: 'period' + (p === nowP ? ' now' : '') },
        el('b', { textContent: p + 1 }), el('span', { textContent: from }), el('span', { textContent: '|' }), el('span', { textContent: to })));
      DAYS.forEach((d, i) => {
        const key = `${i}-${p}`;
        const c = cells()[key];
        const btn = el('button', { type: 'button', className: 'cell' });
        if (c) {
          btn.classList.add('filled', 'c-' + (COLORS.includes(c.color) ? c.color : 'blue'));
          if (i === today && p === nowP) btn.classList.add('now');
          const badge = c.room || '未登録';
          btn.append(el('span', { className: 'name', textContent: c.name }), el('span', { className: 'badge', textContent: badge }));
          btn.setAttribute('aria-label', `${d}曜${p + 1}限 ${c.name}`);
          btn.onclick = () => (editing ? openEdit(key) : go(key));
        } else if (editing) {
          btn.setAttribute('aria-label', `${d}曜${p + 1}限 空き。授業を追加`);
          btn.onclick = () => openEdit(key);
        } else {
          btn.disabled = true;
          btn.setAttribute('aria-label', `${d}曜${p + 1}限 空き`);
        }
        grid.append(btn);
      });
    });
  }

  const slotLabel = (key) => { const [d, p] = key.split('-').map(Number); return `${DAYS[d]}曜 ${p + 1}限（${PERIODS[p][0]}–${PERIODS[p][1]}）`; };

  // ---- リンク一覧 ----
  let activeKey = null;
  function openView(key) {
    activeKey = key;
    const c = cells()[key];
    $('viewName').textContent = c.name;
    $('viewMeta').textContent = [slotLabel(key), c.room, c.teacher].filter(Boolean).join(' ・ ');
    $('viewLinks').replaceChildren(...c.links.map((l) =>
      el('a', {
        href: l.url, target: '_blank', rel: 'noopener noreferrer',
        onclick: (e) => { if (inExtension) { e.preventDefault(); openUrl(l.url); } $('viewDlg').close(); },
      },
        el('b', { textContent: l.label || 'リンク' }), el('small', { textContent: l.url }))));
    $('viewDlg').showModal();
  }

  // ---- 編集 ----
  COLORS.forEach((name) => $('fColors').append(el('label', { style: 'flex:none' },
    el('input', { type: 'radio', name: 'color', value: name }),
    el('span', { className: 'c-' + name, title: name }))));

  function addLinkRow(link = { label: '', url: '' }) {
    const row = el('div', { className: 'link-row' },
      el('input', { type: 'text', placeholder: '名前', value: link.label, maxLength: 30 }),
      el('input', { type: 'text', placeholder: 'https://…', value: link.url, inputMode: 'url' }),
      el('button', { type: 'button', className: 'x', textContent: '×', onclick: () => row.remove() }));
    row.children[0].setAttribute('list', 'linkLabels');
    row.children[0].setAttribute('aria-label', 'リンクの名前');
    row.children[1].setAttribute('aria-label', 'URL');
    row.children[2].setAttribute('aria-label', 'このリンクを消す');
    $('fLinks').append(row);
    return row;
  }
  $('addLink').onclick = () => addLinkRow().children[0].focus();

  const sameNameKeys = (key) => {
    const c = cells()[key];
    return c ? Object.keys(cells()).filter((k) => k !== key && cells()[k].name === c.name) : [];
  };

  function openEdit(key) {
    activeKey = key;
    const c = cells()[key];
    $('editTitle').textContent = slotLabel(key);
    $('fName').value = c ? c.name : '';
    $('fRoom').value = c ? c.room : '';
    $('fTeacher').value = c ? c.teacher : '';
    const color = c && COLORS.includes(c.color) ? c.color : 'blue';
    $('fColors').querySelector(`input[value="${color}"]`).checked = true;
    $('fLinks').replaceChildren();
    (c && c.links.length ? c.links : [{ label: 'シラバス', url: '' }]).forEach(addLinkRow);
    const same = sameNameKeys(key);
    $('fSameWrap').hidden = !same.length;
    $('fSame').checked = false;
    $('fSameText').textContent = `同じ名前の他のコマ（${same.length}件）にも反映する`;
    $('delCell').hidden = !c;
    $('editDlg').showModal();
    if (!c) $('fName').focus();
  }

  $('editForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('fName').value.trim();
    if (!name) return;
    const links = [];
    for (const row of $('fLinks').children) {
      const raw = row.children[1].value.trim();
      if (!raw) continue;
      const url = normalizeUrl(raw);
      if (!url) {
        row.children[1].setCustomValidity('http または https の URL を入れてください');
        row.children[1].reportValidity();
        row.children[1].oninput = () => row.children[1].setCustomValidity('');
        return;
      }
      links.push({ label: row.children[0].value.trim() || 'リンク', url });
    }
    const data = {
      name, links,
      room: $('fRoom').value.trim(),
      teacher: $('fTeacher').value.trim(),
      color: $('fColors').querySelector('input:checked').value,
    };
    const targets = [activeKey, ...($('fSame').checked ? sameNameKeys(activeKey) : [])];
    targets.forEach((k) => { cells()[k] = structuredClone(data); });
    save(); render();
    $('editDlg').close();
  };

  $('delCell').onclick = () => {
    if (!confirm(`「${cells()[activeKey].name}」をこのコマから削除しますか？`)) return;
    delete cells()[activeKey];
    save(); render();
    $('editDlg').close();
  };

  // ---- 学期 ----
  function renderTerms() {
    const ids = Object.keys(state.terms).sort().reverse();
    $('termList').replaceChildren(...ids.map((id) => el('div', { className: 'row' },
      el('button', {
        type: 'button', className: 'btn' + (id === state.current ? ' current' : ''), textContent: termLabel(id),
        onclick: () => { state.current = id; save(); render(); $('termDlg').close(); },
      }),
      el('button', {
        type: 'button', className: 'btn danger', textContent: '削除', hidden: ids.length < 2,
        onclick: () => {
          if (!confirm(`${termLabel(id)} の時間割を削除しますか？元に戻せません。`)) return;
          delete state.terms[id];
          if (state.current === id) state.current = Object.keys(state.terms).sort().reverse()[0];
          save(); render(); renderTerms();
        },
      }))));
  }
  $('termBtn').onclick = () => {
    renderTerms();
    $('tYear').value = state.current.split('-')[0];
    $('termDlg').showModal();
  };
  $('termForm').onsubmit = (e) => {
    e.preventDefault();
    const id = `${parseInt($('tYear').value, 10)}-${$('tNo').value}`;
    if (!state.terms[id]) state.terms[id] = { cells: {} };
    state.current = id;
    save(); render();
    $('termDlg').close();
  };

  $('exportBtn').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    el('a', { href: url, download: 'timetable.json' }).click();
    URL.revokeObjectURL(url);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = JSON.parse(await file.text());
      if (!valid(next)) throw new Error('形式が違います');
      // 外から来たデータなので、リンクは通し直す
      for (const t of Object.values(next.terms)) {
        for (const c of Object.values(t.cells || (t.cells = {}))) {
          c.name = String(c.name || '無題'); c.room = String(c.room || ''); c.teacher = String(c.teacher || '');
          c.links = (Array.isArray(c.links) ? c.links : [])
            .map((l) => ({ label: String(l.label || 'リンク'), url: normalizeUrl(l.url) })).filter((l) => l.url);
        }
      }
      if (!confirm('いまの時間割を、読み込んだ内容で置き換えますか？')) return;
      state = next;
      save(); render(); renderTerms();
    } catch (err) {
      alert('読み込めませんでした：' + err.message);
    }
  };

  // ---- ダイアログ共通 ----
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // 背景タップで閉じる
    d.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => d.close(); });
  });

  render();
  setInterval(render, 60000); // 「いまの時限」の表示を追従させる
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
