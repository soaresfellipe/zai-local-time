// Shared logic (content script, popup and service worker).
// Sources: https://docs.z.ai/devpack/notice/event-glm-5.3-flash
//          https://docs.z.ai/devpack/notice/usage-revision
// If Z.AI extends the campaign, just update PROMO below; if the peak definition
// changes, update PEAK.

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

// Peak hours: Monday to Friday, 14:00-18:00 (UTC+8); everything else (including
// weekends) is off-peak. Peak consumes 3x quota for GLM-5.3 and 1.2x for Flash.
const PEAK = {
  startHour: 14,
  endHour: 18,
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

// Returns {active, start, end, next} for the Mon-Fri 14:00-18:00 (UTC+8) window.
function peakStatus(now = new Date()) {
  // Wall-clock in UTC+8: step the UTC+8 calendar, so local DST never matters.
  const src = new Date(now.getTime() + ZAI_SOURCE_OFFSET_HOURS * 3600e3);
  const y = src.getUTCFullYear(), mo = src.getUTCMonth() + 1, d = src.getUTCDate();
  const mins = src.getUTCHours() * 60 + src.getUTCMinutes();

  if (src.getUTCDay() >= 1 && src.getUTCDay() <= 5 &&
      mins >= PEAK.startHour * 60 && mins < PEAK.endHour * 60)
    return {
      active: true,
      start: fromSourceTime(y, mo, d, PEAK.startHour),
      end: fromSourceTime(y, mo, d, PEAK.endHour),
    };

  // Next weekday 14:00 (skips the rest of today and weekends).
  const weekend = src.getUTCDay() === 0 || src.getUTCDay() === 6;
  for (let k = 0; k <= 7; k++) {
    if (new Date(Date.UTC(y, mo - 1, d + k)).getUTCDay() % 6 === 0) continue; // Sun(0)/Sat(6)
    const start = fromSourceTime(y, mo, d + k, PEAK.startHour);
    if (start > now)
      return { active: false, weekend, next: { start, end: fromSourceTime(y, mo, d + k, PEAK.endHour) } };
  }
  return { active: false, weekend, next: null };
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

function peakText(st, now = new Date()) {
  if (st.active)
    return `Peak hours NOW until ${fmtLocal(st.end, false)} — 3x quota (GLM-5.3) / 1.2x (Flash) (${fmtDuration(st.end - now)} left)`;
  const off = `Off-peak now${st.weekend ? " (weekend)" : ""} — 1x quota`;
  if (st.next)
    return `${off}. Next peak: ${fmtLocal(st.next.start)} (in ${fmtDuration(st.next.start - now)})`;
  return off;
}
