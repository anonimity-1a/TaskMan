const openPanel = () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
};

openPanel();
chrome.runtime.onInstalled.addListener(openPanel);
