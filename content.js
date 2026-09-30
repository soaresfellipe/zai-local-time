// Finds the reset times (which Z.AI shows in UTC+8) and appends the local time next to them.

const MARK = "data-zai-lt";

// 2026-09-30 14:00[:00] | 2026/09/30 14:00 | 2026.09.30 14:00 | 2026-09-30T14:00
const RE_FULL = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
// 09-30 14:00 | 09/30 14:00 (month-day, no year)
const RE_MD = /(?<![\d/.-])(\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;

let settings = { enabled: true, showBanner: true };

// Formats the local time in the same shape as the original: "2026-10-02 20:22", "10-02 20:22" or "20:22".
function fmtSameAs(date, kind) {
  const p = (n) => String(n).padStart(2, "0");
  const time = `${p(date.getHours())}:${p(date.getMinutes())}`;
  const md = `${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  if (kind === "full") return `${date.getFullYear()}-${md} ${time}`;
  if (kind === "md") return `${md} ${time}`;
  return time;
}

function convertMatch(m, isFull) {
  let y, mo, d, h, mi, s;
  if (isFull) [, y, mo, d, h, mi, s] = m.map(Number);
  else {
    [, mo, d, h, mi, s] = m.map(Number);
    y = new Date().getFullYear();
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return fromSourceTime(y, mo, d, h, mi, s || 0);
}

// "Reset Time: 12:15" (5-hour limit) has only the time, in UTC+8: it is the next occurrence of that time.
function resolveTimeOnly(h, mi) {
  const now = Date.now();
  const src = new Date(now + ZAI_SOURCE_OFFSET_HOURS * 3600e3);
  let d = fromSourceTime(src.getUTCFullYear(), src.getUTCMonth() + 1, src.getUTCDate(), h, mi);
  if (d.getTime() <= now) d = new Date(d.getTime() + 86400e3);
  return d;
}

// Looks for a label (e.g. "Reset Time", "Last refresh time") in the text itself or in up to 3 short ancestors.
function hasLabel(node, re) {
  if (re.test(node.nodeValue)) return true;
  let el = node.parentElement;
  for (let i = 0; el && i < 3; i++, el = el.parentElement)
    if (el.textContent.length < 80 && re.test(el.textContent)) return true;
  return false;
}

function processTimeOnly(node, text) {
  const m = text.match(/^(.*?)(\d{1,2}):(\d{2})\s*$/s);
  if (!m || !/^\s*(reset[^:]*:\s*)?$/i.test(m[1]) || !hasLabel(node, /reset/i)) return false;
  const h = +m[2], mi = +m[3];
  if (h > 23 || mi > 59) return false;
  const date = resolveTimeOnly(h, mi);
  const tag = document.createElement("span");
  tag.className = "zai-lt-local";
  tag.setAttribute(MARK, "");
  tag.title = `Original: ${h}:${m[3]} (UTC+8)\nYour time: ${date.toLocaleString()} — ${localTzLabel()}`;
  tag.textContent = ` → ${fmtSameAs(date, "time")}`;
  tag.dataset.src = text;
  node.parentNode.insertBefore(tag, node.nextSibling);
  return true;
}

function processTextNode(node) {
  const text = node.nodeValue;
  if (!text || !/\d:\d\d/.test(text)) return;
  // Already annotated? If React replaced the text, the old annotation is stale.
  const sib = node.nextSibling;
  if (sib?.nodeType === 1 && sib.hasAttribute(MARK)) {
    if (sib.dataset.src === text) return;
    sib.remove();
  }
  // "Last refresh time" is already in the browser time zone; only reset times are in UTC+8.
  if (hasLabel(node, /refresh/i)) return;
  if (processTimeOnly(node, text)) return;
  if (text.length < 8) return;

  const hits = [];
  for (const [re, full] of [[RE_FULL, true], [RE_MD, false]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const overlaps = hits.some((h) => m.index < h.end && m.index + m[0].length > h.start);
      const date = !overlaps && convertMatch(m, full);
      if (date) hits.push({ start: m.index, end: m.index + m[0].length, date, raw: m[0], full });
    }
  }
  if (!hits.length) return;
  hits.sort((a, b) => a.start - b.start);

  const frag = document.createDocumentFragment();
  let pos = 0;
  for (const h of hits) {
    const chunk = text.slice(pos, h.end);
    frag.append(chunk);
    const tag = document.createElement("span");
    tag.dataset.src = chunk;
    tag.className = "zai-lt-local";
    tag.setAttribute(MARK, "");
    tag.title = `Original: ${h.raw} (UTC+8)\nYour time: ${h.date.toLocaleString()} — ${localTzLabel()}`;
    tag.textContent = ` → ${fmtSameAs(h.date, h.full ? "full" : "md")}`;
    frag.append(tag);
    pos = h.end;
  }
  frag.append(text.slice(pos));
  node.parentNode.replaceChild(frag, node);
}

function scan(root) {
  if (!settings.enabled) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || p.closest(`[${MARK}], script, style, textarea, input, [contenteditable="true"]`))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(processTextNode);
}

// Used when settings change: remove all annotations and rescan.
function rescanAll() {
  document.querySelectorAll(".zai-lt-local").forEach((el) => el.remove());
  scan(document.body);
}

let pending = null;
const observer = new MutationObserver((muts) => {
  if (muts.every((m) => [...m.addedNodes].every((n) => n.nodeType === 1 && n.hasAttribute?.(MARK)))) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    observer.disconnect();
    scan(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }, 300);
});

// --- Promo banner ---
let banner;
function renderBanner() {
  if (!settings.showBanner) {
    banner?.remove();
    banner = null;
    return;
  }
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "zai-lt-banner";
    banner.setAttribute(MARK, "");
    banner.title = "Click to minimize";
    banner.addEventListener("click", () => banner.classList.toggle("min"));
    document.body.append(banner);
  }
  const st = promoStatus();
  banner.classList.toggle("on", !!st.active);
  banner.textContent = promoText(st);
}

chrome.storage.sync.get(settings, (s) => {
  settings = s;
  scan(document.body);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  renderBanner();
  setInterval(renderBanner, 30_000);
});

chrome.storage.onChanged.addListener((ch) => {
  for (const k in ch) settings[k] = ch[k].newValue;
  if (settings.enabled) rescanAll();
  else document.querySelectorAll(".zai-lt-local").forEach((el) => el.remove());
  renderBanner();
});
