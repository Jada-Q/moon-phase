# Moon Phase

Tonight's moon, where you stand. A real-time ambient night-sky canvas — the moon is drawn at its actual altitude and azimuth for your chosen city, with the correct illuminated fraction, terminator angle, and rise / set times. Everything is computed locally from `SunCalc`. No API.

<p align="center">
  <em>新月 · 三日月 · 上弦 · 十三夜 · 満月 · 十六夜 · 下弦 · 二十六夜</em>
</p>

**Live**: [moon-phase-2026-05-16.vercel.app](https://moon-phase-2026-05-16.vercel.app)

Open it in a browser tab, or set it as a Mac desktop wallpaper via [Plash](https://sindresorhus.com/plash) — watch the moon drift across your sky tonight, past mountains and city blocks toward the western horizon.

---

## Six cities

| City | URL |
|---|---|
| Tokyo (default) | [`/`](https://moon-phase-2026-05-16.vercel.app/) |
| Kyoto 京都 | [`/?c=kyoto`](https://moon-phase-2026-05-16.vercel.app/?c=kyoto) |
| Hangzhou 杭州 | [`/?c=hangzhou`](https://moon-phase-2026-05-16.vercel.app/?c=hangzhou) |
| New York | [`/?c=nyc`](https://moon-phase-2026-05-16.vercel.app/?c=nyc) |
| Reykjavík | [`/?c=reykjavik`](https://moon-phase-2026-05-16.vercel.app/?c=reykjavik) |
| Sydney | [`/?c=sydney`](https://moon-phase-2026-05-16.vercel.app/?c=sydney) |

Custom point: `/?lat=43.06&lng=141.35&label=Sapporo&tz=Asia/Tokyo`

The bottom dot row (right side on mobile) switches between cities live.

---

## What's actually computed

- **Moon altitude & azimuth** — `SunCalc.getMoonPosition`, mapped onto canvas. Hidden when below horizon (with a faint glow at the horizon for the half hour around moonset / moonrise).
- **Moon phase** — `SunCalc.getMoonIllumination`. Drawn procedurally: a half-lit disc plus a terminator ellipse whose width is `|1 − 2 · fraction| · r`. Crescent under 50%, gibbous over. Waxing lit-right, waning lit-left. A faint earthshine glow appears on the night-side near new moon. A few fixed maria patches give the lit face character.
- **Moon rise & set times** — `SunCalc.getMoonTimes` for the day, shown in the city's local timezone.
- **旧暦 (lunar day)** — civil approximation from phase × 29.53, accurate enough for ambient.
- **Phase name** — traditional Japanese 16-name cycle (新月 → 繊月 → 三日月 → 七日月 → 上弦 → 十日夜 → 十三夜 → 小望月 → 満月 → 十六夜 → 立待月 → 寝待月 → 下弦 → 二十三夜 → 二十六夜 → 晦), which carries more nuance than the seven-name English version.
- **Night sky palette** — interpolated across seven keyframes through the day (deep night → pre-dawn → toned-down day → dusk → deep night again). The piece is always conceptually night — daytime just slides into a deep blue rather than going noon-bright.
- **Stars** — 160 deterministic stars seeded from a fixed RNG (stable across reloads), warmth driven by palette, gentle twinkle.
- **Clouds** — three drifting layers, density and seed driven by the day-of-year so the same date always shows the same cloud weather. They occasionally pass in front of the moon as soft eclipses.
- **City silhouette** — procedural skyline per-city, seeded from the location. Mountains and building blocks, a handful of warm-window dots scattered along.

The label at the bottom-right reminds: *"Local astronomical calculation — no API. Artistic approximation, not measured data."*

---

## 月兎 Tsuki — the moon rabbit

She is the piece's one inhabitant. A small cream-and-pink rabbit who lives on the moon and pounds mochi (Japanese folklore — the dark patches on the full moon trace her mortar and pestle).

When the moon is high, Tsuki floats near it. When the moon sets, she comes down to rest at the city horizon. She has an idle bob (ear twitch and a tiny body breath every 600ms), and once every 30–60 seconds she hops once.

Press the arrow keys to nudge her around the sky. She drifts back to her anchor when you stop.

She is sister to:

- **Nagi 凪** — the diver in [Tide Pixels](https://github.com/Jada-Q/tide-pixels)
- **Echo** — the air-controller silhouette in [Sky Traffic](https://github.com/Jada-Q/sky-traffic)
- **Mamoru** — the harbormaster in [Bay Ships](https://github.com/Jada-Q/bay-ships)
- **Tamaki** — the metro signal-keeper in [Subway Pulse](https://github.com/Jada-Q/subway-pulse)
- **Lava** — the seismograph operator in [Quake Globe](https://github.com/Jada-Q/quake-globe)

---

## Tech stack

- Next.js 16 (App Router, server component for `searchParams`)
- Tailwind v4
- Cormorant Garamond + Geist Mono (`next/font/google`)
- [`suncalc`](https://github.com/mourner/suncalc)
- Plain Canvas 2D + RAF — no external animation library

---

## Local dev

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3013>.

```bash
pnpm build  # production build
```

---

## Used as a desktop wallpaper

1. Install [Plash](https://apps.apple.com/app/plash/id1494023538) (free, Mac App Store).
2. Plash menu bar → `Add Website…` → paste a city URL above.
3. Keep `Browsing Mode` off — Moon Phase has no required interaction; switching cities happens via Plash's website list.

For multi-display: Kyoto on one monitor, NYC on another — the time-shifted moon altitudes across hemispheres make the screen feel like it's tracking the sky together with you.

---

## Elsewhere

- [Tide Pixels](https://github.com/Jada-Q/tide-pixels) — real-time ambient ocean canvas
- [Sky Traffic](https://github.com/Jada-Q/sky-traffic) — live aircraft trails over your city's airspace
- [Bay Ships](https://github.com/Jada-Q/bay-ships) — ship lanes through major harbors (procedural demo)
- [Subway Pulse](https://github.com/Jada-Q/subway-pulse) — Tokyo metro lines as Beck-style abstract diagram (procedural demo)
- [Quake Globe](https://github.com/Jada-Q/quake-globe) — live global earthquakes from USGS as ringing light pulses

---

## License

MIT — do whatever you want, but if you ship a paid product literally cloned from this, at least drop a thank-you somewhere.
