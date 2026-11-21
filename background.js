// Keeps the toolbar badge up to date: green "ON" during the promo window,
// amber "PK" during peak hours (promo takes priority).
importScripts("promo.js");

function updateBadge() {
  const ps = promoStatus();
  const pk = peakStatus();
  const on = ps.active ? "ON" : pk.active ? "PK" : "";
  chrome.action.setBadgeText({ text: on });
  chrome.action.setBadgeBackgroundColor({ color: ps.active ? "#15803d" : "#d97706" });
  chrome.action.setTitle({ title: `${promoText(ps)}\n${peakText(pk)}` });
}

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("tick", { periodInMinutes: 1 }));
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("tick", { periodInMinutes: 1 }));
chrome.alarms.onAlarm.addListener(updateBadge);
updateBadge();
