import SunCalc from "suncalc";

export interface MoonInfo {
  altitude: number; // radians, negative = below horizon
  azimuth: number; // radians from south, clockwise
  phase: number; // 0=new, 0.25=first qtr, 0.5=full, 0.75=last qtr
  fraction: number; // 0..1 illuminated portion
  angle: number; // bright-limb angle (radians)
}

export interface MoonTimes {
  rise: Date | null;
  set: Date | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
}

export function getMoonInfo(date: Date, lat: number, lng: number): MoonInfo {
  const pos = SunCalc.getMoonPosition(date, lat, lng);
  const illum = SunCalc.getMoonIllumination(date);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    phase: illum.phase,
    fraction: illum.fraction,
    angle: illum.angle,
  };
}

export function getMoonTimes(
  date: Date,
  lat: number,
  lng: number,
): MoonTimes {
  const t = SunCalc.getMoonTimes(date, lat, lng);
  return {
    rise: t.rise ?? null,
    set: t.set ?? null,
    alwaysUp: !!t.alwaysUp,
    alwaysDown: !!t.alwaysDown,
  };
}

export function getSunInfo(date: Date, lat: number, lng: number) {
  const pos = SunCalc.getPosition(date, lat, lng);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
  };
}

// Traditional Japanese lunar-phase names — 28-day cycle.
// Inputs `phase` is 0..1 from SunCalc.getMoonIllumination.
export function moonPhaseLabelJa(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "新月";
  if (phase < 0.09) return "繊月";
  if (phase < 0.15) return "三日月";
  if (phase < 0.22) return "七日月";
  if (phase < 0.28) return "上弦";
  if (phase < 0.36) return "十日夜";
  if (phase < 0.44) return "十三夜";
  if (phase < 0.49) return "小望月";
  if (phase < 0.53) return "満月";
  if (phase < 0.58) return "十六夜";
  if (phase < 0.64) return "立待月";
  if (phase < 0.72) return "寝待月";
  if (phase < 0.78) return "下弦";
  if (phase < 0.86) return "二十三夜";
  if (phase < 0.94) return "二十六夜";
  return "晦";
}

export function moonPhaseLabelEn(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "New Moon";
  if (phase < 0.22) return "Waxing Crescent";
  if (phase < 0.28) return "First Quarter";
  if (phase < 0.47) return "Waxing Gibbous";
  if (phase < 0.53) return "Full Moon";
  if (phase < 0.72) return "Waning Gibbous";
  if (phase < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

// 旧暦の日付 (approx, civil — synodic month 29.53 days).
// Not astronomically perfect but good enough for ambient.
export function lunarDay(phase: number): number {
  const day = Math.round(phase * 29.53) + 1;
  return ((day - 1) % 29) + 1;
}

export function formatTimeInTz(
  date: Date | null,
  timezone: string,
): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date);
  } catch {
    return "—";
  }
}
