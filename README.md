# Z.AI Local Time

A small Chrome/Edge extension for the [Z.AI](https://z.ai) GLM Coding Plan usage page.

- **Reset times in your time zone.** Z.AI shows the 5-hour and weekly limit reset times in UTC+8 (Singapore). The extension adds your local time next to each one, in green. Hover over it to see the original value and your time zone.
- **GLM-5.3-Flash promo indicator.** Tells you whether the [GLM-5.3-Flash campaign](https://docs.z.ai/devpack/notice/event-glm-5.3-flash) window (23:00–09:00 UTC+8, until 2026-10-07) is active right now, and when the next one starts. You get a floating banner on z.ai and an **ON** badge on the toolbar icon.

> Unofficial. Not affiliated with or endorsed by Z.AI.

## Install

The extension is not on the Chrome Web Store, so you load it unpacked.

1. Download this repo (`Code → Download ZIP` and extract it, or `git clone`).
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the extension folder.
5. Open <https://z.ai/manage-apikey/coding-plan/personal/usage>.

After you edit any file, click **Reload** on the extension card and refresh the page.

## How it works

| On the page | What the extension does |
| --- | --- |
| `Reset Time: 12:15` (5-hour limit) | Takes the next 12:15 in UTC+8 and shows it in your time zone |
| `Reset Time: 2026-10-03 07:22` (weekly limit) | Converts it from UTC+8 |
| `Last refresh time: ...` | Leaves it alone, because it is already in your browser's time zone |

The popup shows the promo status, today's window in your local time, and two switches: one for converting times on the page and one for the banner.

## Updating the promo

The campaign dates and daily window live in the `PROMO` object at the top of [`promo.js`](promo.js). If Z.AI extends or changes the campaign, edit it there.

## Privacy

No network requests, no analytics. The extension only reads the z.ai page in your browser, and the only thing it stores is your two settings, in `chrome.storage.sync`.

## License

[MIT](LICENSE)
