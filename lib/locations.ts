export interface Location {
  lat: number;
  lng: number;
  label: string;
  timezone: string;
}

export const PRESETS: Record<string, Location> = {
  tokyo: {
    lat: 35.6543,
    lng: 139.7644,
    label: "TOKYO",
    timezone: "Asia/Tokyo",
  },
  kyoto: {
    lat: 35.0116,
    lng: 135.7681,
    label: "KYOTO 京都",
    timezone: "Asia/Tokyo",
  },
  hangzhou: {
    lat: 30.2741,
    lng: 120.1551,
    label: "HANGZHOU 杭州",
    timezone: "Asia/Shanghai",
  },
  nyc: {
    lat: 40.7128,
    lng: -74.006,
    label: "NEW YORK",
    timezone: "America/New_York",
  },
  reykjavik: {
    lat: 64.1466,
    lng: -21.9426,
    label: "REYKJAVÍK",
    timezone: "Atlantic/Reykjavik",
  },
  sydney: {
    lat: -33.8688,
    lng: 151.2093,
    label: "SYDNEY",
    timezone: "Australia/Sydney",
  },
};

export interface UrlParams {
  c?: string;
  lat?: string;
  lng?: string;
  label?: string;
  tz?: string;
}

export function resolveLocation(params: UrlParams | undefined): Location {
  if (!params) return PRESETS.tokyo;

  if (params.c) {
    const key = params.c.toLowerCase();
    if (PRESETS[key]) return PRESETS[key];
  }

  if (params.lat && params.lng) {
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
        label:
          params.label ||
          `${lat.toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`,
        timezone: params.tz || "UTC",
      };
    }
  }

  return PRESETS.tokyo;
}

export const PRESET_KEYS = Object.keys(PRESETS);
