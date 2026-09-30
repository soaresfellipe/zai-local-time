const st = promoStatus();
const box = document.getElementById("status");
box.textContent = promoText(st);
box.classList.toggle("on", !!st.active);

document.getElementById("tz").textContent = `Your time zone: ${localTzLabel()}`;

const today = new Date();
const ws = fromSourceTime(today.getFullYear(), today.getMonth() + 1, today.getDate(), PROMO.dailyStartHour);
const we = fromSourceTime(today.getFullYear(), today.getMonth() + 1, today.getDate() + 1, PROMO.dailyEndHour);
document.getElementById("win").textContent = `${fmtLocal(ws, false)}–${fmtLocal(we, false)}`;

chrome.storage.sync.get({ enabled: true, showBanner: true }, (s) => {
  for (const k of ["enabled", "showBanner"]) {
    const el = document.getElementById(k);
    el.checked = s[k];
    el.addEventListener("change", () => chrome.storage.sync.set({ [k]: el.checked }));
  }
});
