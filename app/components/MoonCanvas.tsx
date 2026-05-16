"use client";

import { useEffect, useRef } from "react";
import { getNightPalette, type NightPalette } from "@/lib/sky";
import { getMoonInfo } from "@/lib/moon";
import type { Location } from "@/lib/locations";

export default function MoonCanvas({ location }: { location: Location }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const stars = generateStars(160);
    const buildings = generateSilhouette(seedFor(location.lat, location.lng));
    const cloudSeed = dayOfYearSeed();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const date = new Date();
      const palette = getNightPalette(date, location.timezone);
      const moon = getMoonInfo(date, location.lat, location.lng);

      const horizonY = h * 0.78;

      drawSky(ctx, w, h, horizonY, palette);
      drawStars(ctx, w, horizonY, stars, t, palette);
      drawMoonGlow(ctx, w, horizonY, moon);
      drawMoon(ctx, w, horizonY, moon, palette);
      drawClouds(ctx, w, horizonY, t, cloudSeed, moon);
      drawHorizonGround(ctx, w, h, horizonY, buildings, palette);
      drawNoise(ctx, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [location.lat, location.lng, location.timezone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full"
      aria-label="Moon Phase — tonight's moon"
    />
  );
}

// --- Sky -------------------------------------------------------------------

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  p: NightPalette,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, p.zenith);
  grad.addColorStop(0.55, p.mid);
  grad.addColorStop(1, p.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY);
}

// --- Stars -----------------------------------------------------------------

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleOffset: number;
}

function generateStars(count: number): Star[] {
  let seed = 90210;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.85, // top 85% of sky
    size: rand() * 1.4 + 0.35,
    brightness: rand() * 0.55 + 0.45,
    twinkleOffset: rand() * Math.PI * 2,
  }));
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  stars: Star[],
  t: number,
  p: NightPalette,
) {
  // Star color from palette so they warm with the horizon at dusk/dawn.
  const [sr, sg, sb] = hexToRgb(p.star);
  for (const s of stars) {
    const sx = s.x * w;
    const sy = s.y * horizonY;
    const twinkle = 0.7 + 0.3 * Math.sin(t * 1.1 + s.twinkleOffset);
    const alpha = s.brightness * twinkle;
    ctx.fillStyle = `rgba(${sr},${sg},${sb},${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Moon ------------------------------------------------------------------

function drawMoonGlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  moon: { altitude: number; azimuth: number; fraction: number },
) {
  // Faint glow at horizon when moon below — "moonset / pre-moonrise"
  if (moon.altitude <= -0.05) {
    if (moon.altitude < -0.25) return;
    const { x } = celestialToScreen(0, moon.azimuth, w, horizonY);
    const fade = (moon.altitude + 0.25) / 0.2;
    const r = 90;
    const grad = ctx.createRadialGradient(x, horizonY, 0, x, horizonY, r);
    const glowAlpha = 0.15 * fade * Math.max(0.2, moon.fraction);
    grad.addColorStop(0, `rgba(240,230,200,${glowAlpha})`);
    grad.addColorStop(1, "rgba(240,230,200,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, horizonY, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const { x, y } = celestialToScreen(moon.altitude, moon.azimuth, w, horizonY);
  const r = 36;
  const intensity = 0.25 + 0.3 * moon.fraction;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  grad.addColorStop(0, `rgba(240,232,210,${intensity * 0.6})`);
  grad.addColorStop(0.4, `rgba(240,232,210,${intensity * 0.18})`);
  grad.addColorStop(1, "rgba(240,232,210,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r * 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  moon: {
    altitude: number;
    azimuth: number;
    phase: number;
    fraction: number;
    angle: number;
  },
  p: NightPalette,
) {
  if (moon.altitude <= -0.05) return;

  const { x, y } = celestialToScreen(moon.altitude, moon.azimuth, w, horizonY);
  const r = 64;

  // Phase: 0=new, 0.25=first qtr, 0.5=full, 0.75=last qtr.
  // Waxing (illumination growing) when phase < 0.5 → lit on right.
  // Waning when phase > 0.5 → lit on left.
  const waxing = moon.phase < 0.5;
  const f = moon.fraction;

  // Dark base — boosted contrast so disc is always visible against sky
  // (even at new moon when there's no sunlit portion to anchor the eye)
  const dark = lighten(p.zenith, 0.11);

  // Earthshine: ramp aggressively near new moon so the disc reads as a soft
  // bluish ghost (mimics real-world earthshine "the old moon in the new moon's arms")
  const earthshineStrength = Math.max(0, (1 - f) * (1 - f)) * 0.55;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // 1. Dark disc base
  ctx.fillStyle = dark;
  ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);

  // 2. Earthshine — soft inner glow on the night side
  if (earthshineStrength > 0.01) {
    const eg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const [er, eGg, eb] = hexToRgb(p.earthshine);
    eg.addColorStop(0, `rgba(${er},${eGg},${eb},${earthshineStrength})`);
    eg.addColorStop(1, `rgba(${er},${eGg},${eb},0)`);
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Lit half (filled rectangle, will be carved by terminator ellipse)
  const litColor = "#f5efdc";
  if (waxing) {
    ctx.fillStyle = litColor;
    ctx.fillRect(x, y - r - 1, r + 2, r * 2 + 2);
  } else {
    ctx.fillStyle = litColor;
    ctx.fillRect(x - r - 1, y - r - 1, r + 2, r * 2 + 2);
  }

  // 4. Terminator ellipse — Math.abs(1 - 2f) is the half-width fraction.
  //    f < 0.5 → crescent: ellipse cuts INTO lit half (dark fill)
  //    f > 0.5 → gibbous: ellipse extends lit half (lit fill)
  const ellipseRx = Math.abs(1 - 2 * f) * r;
  ctx.fillStyle = f < 0.5 ? dark : litColor;
  ctx.beginPath();
  ctx.ellipse(x, y, ellipseRx, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Surface texture — a few subtle "maria" patches on the lit area
  drawMariaTexture(ctx, x, y, r, waxing, f);

  ctx.restore();

  // 6. Crisp rim
  ctx.strokeStyle = `rgba(245,239,220,${0.5 + f * 0.3})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMariaTexture(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  waxing: boolean,
  f: number,
) {
  // Fixed maria positions in moon-local coords (-1..1 disc)
  const MARIA: Array<[number, number, number]> = [
    [-0.25, -0.35, 0.18], // Mare Imbrium
    [0.1, -0.25, 0.14], // Mare Serenitatis
    [0.35, -0.05, 0.1], // Mare Tranquillitatis
    [-0.15, 0.2, 0.15], // Mare Nubium
    [0.45, 0.35, 0.08],
    [-0.4, 0.05, 0.08],
  ];
  ctx.fillStyle = "rgba(60,52,40,0.18)";
  for (const [mx, my, mr] of MARIA) {
    // Only draw if on the lit side (roughly)
    const onLit = waxing ? mx > -0.1 - (1 - 2 * f) * 0.5 : mx < 0.1 + (1 - 2 * f) * 0.5;
    if (!onLit && f < 0.85) continue;
    ctx.beginPath();
    ctx.arc(cx + mx * r, cy + my * r, mr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Clouds ----------------------------------------------------------------

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  t: number,
  seed: number,
  moon: { altitude: number; azimuth: number; fraction: number },
) {
  // Density driven by daily seed (0..1 normalized). Drift slowly across sky.
  const density = 0.25 + (seed % 100) / 200; // 0.25..0.75
  const driftSpeed = 6 + (seed % 11); // px/sec, very slow
  const layers = 3;

  for (let layer = 0; layer < layers; layer++) {
    const yBand = horizonY * (0.15 + layer * 0.22);
    const layerSeed = seed + layer * 37;
    const blobCount = Math.floor(2 + density * 4);
    for (let i = 0; i < blobCount; i++) {
      const baseX = ((layerSeed * 53 + i * 211) % 1000) / 1000;
      const drift = (t * driftSpeed * (1 - layer * 0.2)) / w;
      const x = ((baseX + drift) % 1.2) * w - w * 0.1;
      const y = yBand + Math.sin(t * 0.05 + i) * 12;
      const size = 90 + ((layerSeed * 7 + i * 23) % 80);
      const alpha = 0.05 + density * 0.08 - layer * 0.015;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, `rgba(40,42,72,${alpha * 2})`);
      grad.addColorStop(0.6, `rgba(30,30,52,${alpha})`);
      grad.addColorStop(1, "rgba(20,20,40,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // When clouds pass in front of the moon, a soft halo blooms — but we let
  // that emerge naturally from blob overlap with the moon rather than coding
  // a special-case bloom (keeps the loop simple).
  void moon;
}

// --- Horizon city silhouette -----------------------------------------------

interface Building {
  x: number; // 0..1 normalized
  w: number; // 0..1
  h: number; // 0..1 (relative to silhouette band)
  mountain: boolean;
}

function generateSilhouette(seed: number): Building[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const buildings: Building[] = [];
  let x = 0;
  while (x < 1) {
    const isMountain = rand() < 0.18;
    const width = isMountain ? 0.08 + rand() * 0.14 : 0.012 + rand() * 0.04;
    const height = isMountain
      ? 0.35 + rand() * 0.45
      : 0.08 + rand() * 0.55;
    buildings.push({
      x,
      w: width,
      h: height,
      mountain: isMountain,
    });
    x += width + (rand() - 0.5) * 0.005;
  }
  return buildings;
}

function drawHorizonGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  buildings: Building[],
  p: NightPalette,
) {
  // Faint horizon line first
  ctx.strokeStyle = lightenAlpha(p.horizon, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();

  // Ground fill below horizon
  const gradGround = ctx.createLinearGradient(0, horizonY, 0, h);
  gradGround.addColorStop(0, p.ground);
  gradGround.addColorStop(1, "#000000");
  ctx.fillStyle = gradGround;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Silhouette band — mountains drawn behind buildings.
  const bandHeight = (h - horizonY) * 0.55;
  ctx.fillStyle = "#000000";
  const mountains = buildings.filter((b) => b.mountain);
  const blocks = buildings.filter((b) => !b.mountain);

  // Draw mountains as smooth ridges
  if (mountains.length) {
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    let cx = 0;
    for (const m of mountains) {
      const x0 = m.x * w;
      const x1 = (m.x + m.w) * w;
      const peak = horizonY - m.h * bandHeight * 0.85;
      ctx.lineTo(x0, horizonY);
      ctx.lineTo((x0 + x1) / 2, peak);
      ctx.lineTo(x1, horizonY);
      cx = x1;
    }
    ctx.lineTo(w, horizonY);
    ctx.lineTo(w, horizonY + 2);
    ctx.lineTo(0, horizonY + 2);
    ctx.closePath();
    ctx.fillStyle = "#02030a";
    ctx.fill();
    void cx;
  }

  // Draw building rectangles
  ctx.fillStyle = "#000000";
  for (const b of blocks) {
    const x0 = b.x * w;
    const top = horizonY - b.h * bandHeight;
    ctx.fillRect(x0, top, b.w * w + 0.6, horizonY - top);
  }

  // A handful of warm window lights — at 8% of buildings
  ctx.fillStyle = "rgba(255,210,140,0.55)";
  let i = 0;
  for (const b of blocks) {
    i++;
    if (i % 13 !== 0 && i % 17 !== 0) continue;
    const x0 = b.x * w + b.w * w * 0.3;
    const top = horizonY - b.h * bandHeight + 6;
    ctx.fillRect(x0, top + 6, 1.4, 1.4);
  }
}

// --- Noise -----------------------------------------------------------------

function drawNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  ctx.fillStyle = "rgba(255,255,255,0.012)";
  for (let i = 0; i < 220; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.fillStyle = "rgba(0,0,0,0.015)";
  for (let i = 0; i < 220; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
}

// --- Helpers ---------------------------------------------------------------

function celestialToScreen(
  altitude: number,
  azimuth: number,
  w: number,
  horizonY: number,
) {
  let az = azimuth;
  while (az > Math.PI) az -= Math.PI * 2;
  while (az < -Math.PI) az += Math.PI * 2;
  const x = w * 0.5 + (az / (Math.PI / 2)) * w * 0.45;
  const y = horizonY * (1 - Math.max(0, altitude) / (Math.PI / 2)) - 12;
  return { x, y };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lighten(hex: string, by: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * by));
  const lg = Math.min(255, Math.round(g + (255 - g) * by));
  const lb = Math.min(255, Math.round(b + (255 - b) * by));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function lightenAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function seedFor(lat: number, lng: number): number {
  // Per-city deterministic seed — same skyline every reload for that city.
  return Math.abs(Math.floor((lat * 1000 + lng * 1000) % 100000)) + 7;
}

function dayOfYearSeed(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}
