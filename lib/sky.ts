// Moon Phase is always-night. Palette varies subtly by local hour
// (late evening warmer at the horizon, deep night colder + more violet).
// 4 keyframes interpolated, deep indigo throughout.

export interface NightPalette {
  zenith: string; // top of sky
  mid: string; // middle band
  horizon: string; // warmth at horizon
  ground: string; // city silhouette / ground fill
  star: string; // star color
  earthshine: string; // faint glow on shadowed moon
}

const KEYFRAMES: Array<{ h: number; palette: NightPalette }> = [
  // Late dusk — warmth still at horizon
  {
    h: 18,
    palette: {
      zenith: "#0a0a22",
      mid: "#1c1840",
      horizon: "#3a2848",
      ground: "#080814",
      star: "#f0eede",
      earthshine: "#2a2640",
    },
  },
  // Civil → deep night
  {
    h: 21,
    palette: {
      zenith: "#06061a",
      mid: "#101030",
      horizon: "#1a1a38",
      ground: "#040408",
      star: "#f4f0e0",
      earthshine: "#1c1a32",
    },
  },
  // Deep night (peak indigo)
  {
    h: 1,
    palette: {
      zenith: "#03031a",
      mid: "#0a0a26",
      horizon: "#121432",
      ground: "#020206",
      star: "#fafadc",
      earthshine: "#181628",
    },
  },
  // Pre-dawn — cooler, paler horizon hint
  {
    h: 4,
    palette: {
      zenith: "#05061e",
      mid: "#101632",
      horizon: "#2a2c50",
      ground: "#04060a",
      star: "#f4f4e0",
      earthshine: "#1e1e3a",
    },
  },
  // Civil twilight (dawn) — kept dim so the moon piece never goes "day"
  {
    h: 6,
    palette: {
      zenith: "#0a0e2a",
      mid: "#1e2448",
      horizon: "#4a3e60",
      ground: "#080a14",
      star: "#e8e4cc",
      earthshine: "#28284a",
    },
  },
  // Daytime — collapsed to deep blue so daylight viewers still see the piece
  // (the piece is conceptually "night", but does not lie about the sky)
  {
    h: 12,
    palette: {
      zenith: "#1a2240",
      mid: "#2e3a60",
      horizon: "#5a5a7c",
      ground: "#0c0e16",
      star: "#d8d4be",
      earthshine: "#3a3a58",
    },
  },
  // Late afternoon ramp back into dusk
  {
    h: 17,
    palette: {
      zenith: "#0e1230",
      mid: "#1c2046",
      horizon: "#403048",
      ground: "#080814",
      star: "#ece8d4",
      earthshine: "#2c2a44",
    },
  },
  // Loop back to dusk (h=18)
  {
    h: 18,
    palette: {
      zenith: "#0a0a22",
      mid: "#1c1840",
      horizon: "#3a2848",
      ground: "#080814",
      star: "#f0eede",
      earthshine: "#2a2640",
    },
  },
];

export function getNightPalette(
  date: Date,
  timezone: string = "Asia/Tokyo",
): NightPalette {
  const localHour = getLocalHour(date, timezone);

  // KEYFRAMES is a sequence whose `h` may wrap past 24 — to handle
  // 21 → 1 cleanly, we normalize each segment.
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    const aH = a.h;
    let bH = b.h;
    if (bH < aH) bH += 24;
    let cur = localHour;
    if (cur < aH) cur += 24;
    if (cur >= aH && cur <= bH) {
      const t = (cur - aH) / (bH - aH);
      return {
        zenith: lerpColor(a.palette.zenith, b.palette.zenith, t),
        mid: lerpColor(a.palette.mid, b.palette.mid, t),
        horizon: lerpColor(a.palette.horizon, b.palette.horizon, t),
        ground: lerpColor(a.palette.ground, b.palette.ground, t),
        star: lerpColor(a.palette.star, b.palette.star, t),
        earthshine: lerpColor(a.palette.earthshine, b.palette.earthshine, t),
      };
    }
  }
  return KEYFRAMES[0].palette;
}

function getLocalHour(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return (h + m / 60) % 24;
  } catch {
    return (date.getUTCHours() + date.getUTCMinutes() / 60) % 24;
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
