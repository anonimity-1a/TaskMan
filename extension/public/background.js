const PAGE = "popup.html";
const WIDTH = 1180;
const HEIGHT = 800;

const openWindow = async () => {
  const url = chrome.runtime.getURL(PAGE);
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["popup"] });
  const existing = windows.find((win) => win.tabs?.some((tab) => tab.url === url));
  if (existing?.id != null) {
    await chrome.windows.update(existing.id, { focused: true, drawAttention: true });
    return;
  }
  const current = await chrome.windows.getLastFocused();
  const width = Math.min(WIDTH, Math.max(480, (current.width ?? WIDTH) - 80));
  const height = Math.min(HEIGHT, Math.max(640, (current.height ?? HEIGHT) - 80));
  const left = Math.max(0, Math.round((current.left ?? 0) + ((current.width ?? width) - width) / 2));
  const top = Math.max(0, Math.round((current.top ?? 0) + ((current.height ?? height) - height) / 2));
  await chrome.windows.create({
    url,
    type: "popup",
    width,
    height,
    left,
    top,
    focused: true,
  });
};

chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
chrome.action.onClicked.addListener(() => {
  openWindow().catch(() => undefined);
});
