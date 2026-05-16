import MoonCanvas from "./components/MoonCanvas";
import Overlay from "./components/Overlay";
import CitySwitcher from "./components/CitySwitcher";
import TsukiSprite from "./components/TsukiSprite";
import { resolveLocation, type UrlParams } from "@/lib/locations";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const params: UrlParams = {
    c: pickString(raw.c),
    lat: pickString(raw.lat),
    lng: pickString(raw.lng),
    label: pickString(raw.label),
    tz: pickString(raw.tz),
  };
  const location = resolveLocation(params);
  const activeKey = (params.c?.toLowerCase()) || (params.lat ? "" : "tokyo");

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MoonCanvas location={location} />
      <Overlay location={location} />
      <CitySwitcher active={activeKey} />
      <TsukiSprite location={location} />
    </main>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
