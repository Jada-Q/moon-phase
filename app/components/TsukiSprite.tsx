"use client";

import { useEffect, useRef } from "react";
import { getMoonInfo } from "@/lib/moon";
import type { Location } from "@/lib/locations";

// 10 wide × 12 tall pixel sprite. Char map:
// . transparent, F fur (cream), B inner body shadow, P pink inner-ear / nose
// E eye (dark), M mortar wood, T pestle wood, R mortar rim highlight
const FRAME_IDLE_A = [
  ".F......F.",
  ".F.....FF.",
  "FF.....FF.",
  "FPF...FPF.",
  "FFFFFFFFF.",
  "FFEFFFEFFF",
  "FFFFPFFFFF",
  ".FFFFFFFF.",
  ".FFFFFFFFR",
  "..MMMMMMR.",
  "..MTTTTM..",
  "..MMMMMM..",
];

const FRAME_IDLE_B = [
  ".F......F.",
  ".F.....FF.",
  "FF.....FF.",
  "FPF...FPF.",
  "FFFFFFFFF.",
  "FFEFFFEFFF",
  "FFFFPFFFFF",
  ".FFFFFFFF.",
  ".FFFFFFFFR",
  "..MMMMMMR.",
  ".TMMMMMMT.",
  "..MMMMMM..",
];

const FRAME_HOP = [
  "FF......FF",
  "FF......FF",
  "FF......FF",
  "FPF....FPF",
  "FFFFFFFFFF",
  "FFEFFFEFFF",
  "FFFFPFFFFF",
  ".FFFFFFFF.",
  "..FFFFFF..",
  "..F....F..",
  "..F....F..",
  "..........",
];

const COLORS: Record<string, string> = {
  F: "#f5efdc", // cream fur
  B: "#cbc4ad",
  P: "#e8b8c4", // pink inner ear / nose
  E: "#1a1612", // eye
  M: "#7a5234", // mortar wood
  T: "#a07040", // pestle / lighter wood
  R: "#b89060", // mortar rim
};

const PIXEL = 6;
const CANVAS_W = 10 * PIXEL;
const CANVAS_H = 12 * PIXEL;
const X_PADDING = 20;
const MOVE_SPEED = 220; // px/sec

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: string[],
  yOffset = 0,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const color = COLORS[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL, (y + yOffset) * PIXEL, PIXEL, PIXEL);
      }
    }
  }
}

export default function TsukiSprite({ location }: { location: Location }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const keys = new Set<string>();
    // pos.x / pos.y are USER OFFSETS relative to anchor (moon when up,
    // horizon when down). Resets gradually when user idle.
    const pos = { x: 0, y: 0 };
    let lastInputAt = 0;
    let frameToggle = 0;
    let lastFrameSwap = performance.now();
    let lastTick = performance.now();
    let raf = 0;

    // Auto-hop state — random 1s hop every 30-60s when idle
    let nextHopAt = performance.now() + 30000 + Math.random() * 30000;
    let hopUntil = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "ArrowLeft" ||
        k === "ArrowRight" ||
        k === "w" ||
        k === "a" ||
        k === "s" ||
        k === "d"
      ) {
        keys.add(k);
        lastInputAt = performance.now();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const tick = (now: number) => {
      const dt = Math.min((now - lastTick) / 1000, 1 / 30);
      lastTick = now;

      // User-driven offset
      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx -= MOVE_SPEED * dt;
      if (keys.has("ArrowRight") || keys.has("d")) dx += MOVE_SPEED * dt;
      if (keys.has("ArrowUp") || keys.has("w")) dy -= MOVE_SPEED * dt;
      if (keys.has("ArrowDown") || keys.has("s")) dy += MOVE_SPEED * dt;

      pos.x += dx;
      pos.y += dy;

      // Compute anchor from moon position
      const moon = getMoonInfo(new Date(), location.lat, location.lng);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const horizonY = h * 0.78;

      // Anchor: just above moon when moon up; otherwise mid-horizon center
      let anchorX: number;
      let anchorY: number;
      if (moon.altitude > -0.05) {
        let az = moon.azimuth;
        while (az > Math.PI) az -= Math.PI * 2;
        while (az < -Math.PI) az += Math.PI * 2;
        anchorX = w * 0.5 + (az / (Math.PI / 2)) * w * 0.45;
        anchorY =
          horizonY * (1 - Math.max(0, moon.altitude) / (Math.PI / 2)) -
          12 -
          80; // 80px above moon center
      } else {
        anchorX = w * 0.5;
        anchorY = horizonY - 40;
      }

      // Clamp final position within sky bounds — never below horizon
      let finalX = anchorX + pos.x;
      let finalY = anchorY + pos.y;
      if (finalX < X_PADDING) {
        pos.x = X_PADDING - anchorX;
        finalX = X_PADDING;
      }
      if (finalX > w - X_PADDING - CANVAS_W) {
        pos.x = w - X_PADDING - CANVAS_W - anchorX;
        finalX = w - X_PADDING - CANVAS_W;
      }
      const maxY = horizonY - CANVAS_H - 4; // never let rabbit fall below horizon
      if (finalY > maxY) {
        pos.y = maxY - anchorY;
        finalY = maxY;
      }
      if (finalY < 20) {
        pos.y = 20 - anchorY;
        finalY = 20;
      }

      wrap.style.transform = `translate(${finalX}px, ${finalY}px)`;

      // Slow drift back to anchor when idle (last 2s)
      const userIdle = now - lastInputAt > 2000;
      if (userIdle) {
        pos.x *= Math.pow(0.4, dt);
        pos.y *= Math.pow(0.4, dt);
      }

      // Frame toggle every 600ms
      if (now - lastFrameSwap > 600) {
        frameToggle = 1 - frameToggle;
        lastFrameSwap = now;
      }

      // Hop trigger
      if (now > nextHopAt && hopUntil === 0) {
        hopUntil = now + 1000; // 1s hop
        nextHopAt = now + 30000 + Math.random() * 30000;
      }
      if (hopUntil > 0 && now > hopUntil) hopUntil = 0;

      const inHop = hopUntil > 0;
      const frame = inHop
        ? FRAME_HOP
        : frameToggle
          ? FRAME_IDLE_A
          : FRAME_IDLE_B;
      const yOffset = inHop ? 0 : frameToggle ? 0 : 1;

      drawFrame(ctx, frame, yOffset);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [location.lat, location.lng, location.timezone]);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed left-0 top-0 z-10 hidden select-none md:block"
      style={{
        width: `${CANVAS_W}px`,
        height: `${CANVAS_H}px`,
        willChange: "transform",
      }}
      aria-label="月兎 Tsuki — moon rabbit (arrow keys to move)"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: `${CANVAS_W}px`,
          height: `${CANVAS_H}px`,
          imageRendering: "pixelated",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
        }}
      />
    </div>
  );
}
