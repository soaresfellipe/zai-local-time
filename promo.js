// Shared logic (content script, popup and service worker).
// Source: https://docs.z.ai/devpack/notice/event-glm-5.3-flash
// If Z.AI extends the campaign, just update PROMO below.

const ZAI_SOURCE_OFFSET_HOURS = 8; // time zone used by the site: Singapore / UTC+8, no DST

const PROMO = {
  model: "GLM-5.3-Flash",
  // Campaign: 2026-09-03 00:00 to 2026-10-07 23:59 (UTC+8)
  startDate: [2026, 9, 3],
  endDate: [2026, 10, 7],
  // Daily window: 23:00 to 09:00 the next day (UTC+8)
  dailyStartHour: 23,
  dailyEndHour: 9,
};

// Converts a UTC+8 wall-clock date/time into an absolute Date.
function fromSourceTime(y, mo, d, h = 0, mi = 0, s = 0) {
  return new Date(Date.UTC(y, mo - 1, d, h - ZAI_SOURCE_OFFSET_HOURS, mi, s));
}

// Returns {active, start, end, next, campaignOver, campaignNotStarted}.
function promoStatus(now = new Date()) {
  const campStart = fromSourceTime(...PROMO.startDate, 0, 0);
  const campEnd = fromSourceTime(...PROMO.endDate, 24, 0);

  if (now >= campEnd) return { active: false, campaignOver: true };

  // Build yesterday's, today's and tomorrow's windows (UTC+8 calendar), clipped to the campaign.
  const src = new Date(now.getTime() + ZAI_SOURCE_OFFSET_HOURS * 3600e3);
  const y = src.getUTCFullYear(), mo = src.getUTCMonth() + 1, d = src.getUTCDate();
  const windows = [];
  for (let k = -1; k <= 1; k++) {
    let start = fromSourceTime(y, mo, d + k, PROMO.dailyStartHour);
    let end = fromSourceTime(y, mo, d + k + 1, PROMO.dailyEndHour);
    if (end <= campStart || start >= campEnd) continue;
    if (start < campStart) start = campStart;
    if (end > campEnd) end = campEnd;
    windows.push({ start, end });
  }

  const cur = windows.find((w) => now >= w.start && now < w.end);
  if (cur) return { active: true, ...cur };

  const next = windows.find((w) => w.start > now);
  return {
    active: false,
    next: next || null,
    campaignNotStarted: now < campStart,
  };
}

function fmtLocal(date, withDate = true) {
  const opts = { hour: "2-digit", minute: "2-digit" };
  if (withDate) Object.assign(opts, { day: "2-digit", month: "2-digit" });
  return date.toLocaleString(undefined, opts);
}

function localTzLabel() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const off = -new Date().getTimezoneOffset() / 60;
  return `${tz} (UTC${off >= 0 ? "+" : ""}${off})`;
}

function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

function promoText(st, now = new Date()) {
  if (st.campaignOver) return `${PROMO.model} campaign has ended`;
  if (st.active)
    return `${PROMO.model} promo ACTIVE until ${fmtLocal(st.end, false)} (${fmtDuration(st.end - now)} left)`;
  if (st.next)
    return `${PROMO.model} promo inactive. Next window: ${fmtLocal(st.next.start)} (in ${fmtDuration(st.next.start - now)})`;
  return `${PROMO.model} promo inactive`;
}
