import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { SleepEmptyCta } from "../sleep-empty-cta";

describe("SleepEmptyCta (AC1 — empty Sleep screen)", () => {
  it("renders the value prop sentence", () => {
    render(<SleepEmptyCta />);
    expect(
      screen.getByText(
        /Connect a sleep tracker to see your trends automatically/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows a CTA to connect Oura", () => {
    render(<SleepEmptyCta />);
    const ouraLink = screen.getByRole("link", { name: /Connect Oura/i });
    expect(ouraLink).toBeInTheDocument();
    expect(ouraLink).toHaveAttribute("href", "/settings/integrations");
  });

  it("shows a CTA to connect Apple Health", () => {
    render(<SleepEmptyCta />);
    const ahLink = screen.getByRole("link", { name: /Connect Apple Health/i });
    expect(ahLink).toBeInTheDocument();
    expect(ahLink).toHaveAttribute("href", "/settings/integrations");
  });

  it("shows a manual-log affordance", () => {
    render(<SleepEmptyCta />);
    const manualLink = screen.getByRole("link", { name: /Log manually/i });
    expect(manualLink).toBeInTheDocument();
  });

  it("all three CTAs are rendered together", () => {
    render(<SleepEmptyCta />);
    expect(
      screen.getByRole("link", { name: /Connect Oura/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Connect Apple Health/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Log manually/i }),
    ).toBeInTheDocument();
  });
});
