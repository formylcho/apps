// 時間割のサイドパネルを「新しいタブ」のときだけ有効にする。
// パネル自体はウィンドウ単位で開きっぱなしにしておき、新しいタブ以外のタブでは無効にして隠す。

const isNewTab = (tab) => /^(chrome|edge):\/\/(newtab|new-tab-page)/.test(tab.pendingUrl || tab.url || '');

const sync = (tab) => {
  if (tab.id === undefined) return;
  chrome.sidePanel.setOptions({ tabId: tab.id, path: 'panel.html', enabled: isNewTab(tab) }).catch(() => {});
};

const syncAll = async () => {
  for (const tab of await chrome.tabs.query({})) sync(tab);
};

// ツールバーのアイコンを押すとパネルが開く（ウィンドウごとに最初の一度だけ必要）
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(syncAll);
chrome.runtime.onStartup.addListener(syncAll);
chrome.tabs.onCreated.addListener(sync);
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url !== undefined || info.status === 'loading') sync(tab);
});
