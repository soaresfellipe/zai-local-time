// Keeps the toolbar badge up to date: green "ON" during the promo window.
importScripts("promo.js");

function updateBadge() {
  const st = promoStatus();
  chrome.action.setBadgeText({ text: st.active ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#15803d" });
  chrome.action.setTitle({ title: promoText(st) });
}

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("tick", { periodInMinutes: 1 }));
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("tick", { periodInMinutes: 1 }));
chrome.alarms.onAlarm.addListener(updateBadge);
updateBadge();
