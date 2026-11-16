/**
 * Google Maps links (SPEC §9). Pure: no network, no DOM.
 */

export interface LocationFields {
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  maps_query: string | null;
}

export interface NavTarget extends Partial<LocationFields> {
  name: string;
}

const DIR_BASE = "https://www.google.com/maps/dir/?api=1";

/** Driving directions link: coordinates → pasted link → search text. */
export function buildNavUrl(target: NavTarget): string {
  const { latitude, longitude, maps_url, maps_query, name } = target;
  if (isCoord(latitude, longitude)) {
    return `${DIR_BASE}&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`;
  }
  if (maps_url) return maps_url;
  const q = (maps_query ?? "").trim() || name;
  return `${DIR_BASE}&destination=${encodeURIComponent(q)}&travelmode=driving&dir_action=navigate`;
}

/** iOS Google Maps app scheme, to try when the https link opens in a web view. */
export function buildAppNavUrl(latitude: number, longitude: number): string {
  return `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
}

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const LAT_LNG_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const DATA_RE = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const AT_RE = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
const PARAM_KEYS = ["destination", "daddr", "q", "query", "ll"];

const EMPTY: LocationFields = { latitude: null, longitude: null, maps_url: null, maps_query: null };

/**
 * One "ตำแหน่ง" field accepts (SPEC §9):
 * - long Google Maps link → coordinates (prefer `!3d…!4d…`, else `@lat,lng`) + the link
 * - short link (maps.app.goo.gl, goo.gl/maps) → kept as maps_url
 * - "lat,lng" → coordinates
 * - anything else → maps_query
 */
export function parseLocationInput(input: string): LocationFields {
  const text = input.trim();
  if (!text) return { ...EMPTY };

  const coords = matchLatLng(text);
  if (coords) return { ...EMPTY, ...coords };

  const url = parseUrl(text);
  if (!url) return { ...EMPTY, maps_query: text };

  const host = url.hostname.toLowerCase();
  if (SHORT_LINK_HOSTS.has(host) && (host !== "goo.gl" || url.pathname.startsWith("/maps"))) {
    return { ...EMPTY, maps_url: text };
  }

  const fromUrl =
    pair(DATA_RE.exec(text)) ??
    pair(AT_RE.exec(text)) ??
    PARAM_KEYS.map((k) => matchLatLng(url.searchParams.get(k) ?? "")).find(Boolean) ??
    null;
  return { ...EMPTY, ...(fromUrl ?? {}), maps_url: text };
}

function parseUrl(text: string): URL | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function matchLatLng(text: string): Pick<LocationFields, "latitude" | "longitude"> | null {
  return pair(LAT_LNG_RE.exec(text), [1, 2]);
}

function pair(
  m: RegExpExecArray | null,
  groups: [number, number] = [1, 2],
): Pick<LocationFields, "latitude" | "longitude"> | null {
  if (!m) return null;
  const lat = Number(m[groups[0]]);
  const lng = Number(m[groups[1]]);
  if (!isCoord(lat, lng)) return null;
  return { latitude: round6(lat), longitude: round6(lng) };
}

function isCoord(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** DB stores numeric(9,6) */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
