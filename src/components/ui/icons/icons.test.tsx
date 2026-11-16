// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HAND_ICON_PATHS, HandIcon, type HandIconName } from ".";

afterEach(() => cleanup());

describe("HandIcon", () => {
  it("renders every icon as an aria-hidden svg", () => {
    for (const name of Object.keys(HAND_ICON_PATHS) as HandIconName[]) {
      const { container, unmount } = render(<HandIcon name={name} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("aria-hidden"), name).toBe("true");
      expect(svg.children.length, name).toBeGreaterThan(0);
      unmount();
    }
  });

  it("exposes a label when given one", () => {
    render(<HandIcon name="lock" aria-label="ล็อกเวลาถึง" />);
    expect(screen.getByRole("img", { name: "ล็อกเวลาถึง" })).toBeTruthy();
  });
});
