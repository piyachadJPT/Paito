// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SceneSubject, SkySlot } from "@/lib/scene";
import { PostcardScene } from "./PostcardScene";
import { SUBJECTS } from "./subjects";

afterEach(() => cleanup());

const subjects = Object.keys(SUBJECTS) as SceneSubject[];
const skies: SkySlot[] = ["dawn", "morning", "day", "evening", "night", "late"];

describe("PostcardScene", () => {
  it.each(subjects.flatMap((s) => skies.map((k) => [s, k] as const)))("%s under a %s sky", (subject, sky) => {
    const { container } = render(<PostcardScene scene={{ sky, subject, extras: [] }} height={150} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.style.height).toBe("150px");
    // sky, ground/desk and subject layers
    expect(svg.querySelectorAll(":scope > g").length).toBeGreaterThanOrEqual(3);
  });

  it("renders extras on top", () => {
    const { container } = render(
      <PostcardScene scene={{ sky: "night", subject: "temple", extras: ["fireworks", "new_year", "alarm"] }} height={96} />,
    );
    const layers = [...container.querySelectorAll("svg > g")].map((g) => g.getAttribute("data-layer"));
    expect(layers.slice(-3)).toEqual(["fireworks", "new_year", "alarm"]);
    expect(container.textContent).toContain("สวัสดีปีใหม่");
  });

  it("gives each instance its own gradient ids", () => {
    const { container } = render(
      <>
        <PostcardScene scene={{ sky: "day", subject: "temple", extras: [] }} height={150} />
        <PostcardScene scene={{ sky: "day", subject: "temple", extras: [] }} height={150} />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
