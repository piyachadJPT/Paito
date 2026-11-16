// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PaperNote } from "./PaperNote";
import { Stamp } from "./Stamp";

afterEach(() => cleanup());

describe("Stamp", () => {
  it("wraps and clamps long place names instead of overflowing", () => {
    render(<Stamp size="md" tone="red">พิพิธภัณฑ์เซรามิคธนบดีและศูนย์การเรียนรู้ลำปาง</Stamp>);
    const text = screen.getByText(/พิพิธภัณฑ์/);
    expect(text.className).toContain("line-clamp-3");
    expect(text.className).toContain("break-words");
  });

  it("keeps its text readable as plain text", () => {
    const { container } = render(
      <Stamp size="sm" tone="red">
        เสร็จ <br />
        09:21
      </Stamp>,
    );
    expect(container.textContent).toBe("เสร็จ 09:21");
  });
});

describe("Stamp postmark tone", () => {
  it("sits on a solid paper disc so the ink passes contrast over any picture", () => {
    const { container } = render(<Stamp tone="postmark">ที่พักลำปาง</Stamp>);
    const ring = container.firstElementChild as HTMLElement;
    expect(ring.className).toContain("bg-card/90");
    expect(ring.className).toContain("text-ink-red");
  });
});

describe("PaperNote", () => {
  it("can be an alert", () => {
    render(<PaperNote role="alert">อีก 10 นาทีต้องออก</PaperNote>);
    expect(screen.getByRole("alert").textContent).toContain("อีก 10 นาทีต้องออก");
  });
});
