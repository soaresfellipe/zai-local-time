const st = promoStatus();
const box = document.getElementById("status");
box.textContent = promoText(st);
box.classList.toggle("on", !!st.active);

const pk = peakStatus();
const peakBox = document.getElementById("peak");
peakBox.textContent = peakText(pk);
peakBox.classList.toggle("peak", !!pk.active);
const cur = pk.active ? pk : pk.next;
if (cur)
  document.getElementById("peakWin").textContent = `${fmtLocal(cur.start, false)}–${fmtLocal(cur.end, false)}`;

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
