import { describe, expect, it } from "vitest";
import { buildAppNavUrl, buildNavUrl, parseLocationInput } from ".";

describe("buildNavUrl", () => {
  it("1. coordinates first", () => {
    expect(buildNavUrl({ name: "วัด", latitude: 18.2172, longitude: 99.3906, maps_url: "https://maps.app.goo.gl/x", maps_query: "q" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=18.2172,99.3906&travelmode=driving&dir_action=navigate",
    );
  });

  it("2. then the pasted link", () => {
    expect(buildNavUrl({ name: "วัด", maps_url: "https://maps.app.goo.gl/abc", maps_query: "q" })).toBe("https://maps.app.goo.gl/abc");
  });

  it("3. then the search text, else the name (encoded)", () => {
    expect(buildNavUrl({ name: "x", maps_query: "วัดร่องขุ่น เชียงราย" })).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("วัดร่องขุ่น เชียงราย")}&travelmode=driving&dir_action=navigate`,
    );
    expect(buildNavUrl({ name: "A & B", maps_query: "  " })).toContain("destination=A%20%26%20B&");
    expect(buildNavUrl({ name: "only name" })).toContain("destination=only%20name&");
  });

  it("ignores invalid coordinates", () => {
    expect(buildNavUrl({ name: "n", latitude: 200, longitude: 10 })).toContain("destination=n&");
    expect(buildNavUrl({ name: "n", latitude: 18, longitude: null })).toContain("destination=n&");
  });

  it("app scheme for the iOS fallback", () => {
    expect(buildAppNavUrl(18.2, 99.4)).toBe("comgooglemaps://?daddr=18.2,99.4&directionsmode=driving");
  });
});

describe("parseLocationInput", () => {
  const LONG =
    "https://www.google.com/maps/place/Wat/@18.2100000,99.3800000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d18.2172361!4d99.3905844!16s";

  it("long link: prefers !3d!4d over @ and keeps the link", () => {
    expect(parseLocationInput(LONG)).toEqual({ latitude: 18.217236, longitude: 99.390584, maps_url: LONG, maps_query: null });
  });

  it("long link with only @lat,lng", () => {
    const url = "https://www.google.com/maps/@13.7563309,100.5017651,15z";
    expect(parseLocationInput(url)).toMatchObject({ latitude: 13.756331, longitude: 100.501765, maps_url: url });
  });

  it("link with ?q=lat,lng", () => {
    expect(parseLocationInput("https://maps.google.com/?q=18.5,98.9")).toMatchObject({ latitude: 18.5, longitude: 98.9 });
  });

  it("link without coordinates → maps_url only", () => {
    const url = "https://www.google.com/maps/search/coffee";
    expect(parseLocationInput(url)).toEqual({ latitude: null, longitude: null, maps_url: url, maps_query: null });
  });

  it.each(["https://maps.app.goo.gl/AbCdEf123", "https://goo.gl/maps/xyz"])("short link %s → maps_url, not parsed", (url) => {
    expect(parseLocationInput(url)).toEqual({ latitude: null, longitude: null, maps_url: url, maps_query: null });
  });

  it("other goo.gl links are not treated as short map links", () => {
    expect(parseLocationInput("https://goo.gl/other").maps_url).toBe("https://goo.gl/other");
  });

  it.each([
    ["18.2172, 99.3906", 18.2172, 99.3906],
    ["  -33.8688,151.2093 ", -33.8688, 151.2093],
    ["13,100", 13, 100],
  ])("coordinates %j", (text, lat, lng) => {
    expect(parseLocationInput(text)).toEqual({ latitude: lat, longitude: lng, maps_url: null, maps_query: null });
  });

  it("out-of-range coordinates are just text", () => {
    expect(parseLocationInput("95.1, 100.2")).toMatchObject({ latitude: null, maps_query: "95.1, 100.2" });
  });

  it("text → maps_query; empty → nothing", () => {
    expect(parseLocationInput("  วัดร่องขุ่น ")).toEqual({ latitude: null, longitude: null, maps_url: null, maps_query: "วัดร่องขุ่น" });
    expect(parseLocationInput("   ")).toEqual({ latitude: null, longitude: null, maps_url: null, maps_query: null });
  });

  it("malformed http text falls back to a query", () => {
    expect(parseLocationInput("http://")).toMatchObject({ maps_query: "http://" });
  });
});
