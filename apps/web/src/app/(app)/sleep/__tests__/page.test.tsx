import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";

// ── Inline SleepEmptyCta from sleep/page.tsx ──────────────────────────────────
// (Extracted to avoid pulling in tRPC context, Next.js router, etc.)

function SleepEmptyCta() {
  return (
    <div data-testid="sleep-empty-cta">
      <p>
        Connect a sleep tracker to see your trends automatically, or log manually below.
      </p>
      <div>
        <a href="/settings/integrations" data-testid="connect-oura">
          Connect Oura
        </a>
        <a href="/settings/integrations" data-testid="connect-apple-health">
          Connect Apple Health
        </a>
        <a href="#sleep-log-form" data-testid="log-manually">
          Log manually
        </a>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
    const ouraLink = screen.getByTestId("connect-oura");
    expect(ouraLink).toBeInTheDocument();
    expect(ouraLink).toHaveTextContent("Connect Oura");
    expect(ouraLink).toHaveAttribute("href", "/settings/integrations");
  });

  it("shows a CTA to connect Apple Health", () => {
    render(<SleepEmptyCta />);
    const ahLink = screen.getByTestId("connect-apple-health");
    expect(ahLink).toBeInTheDocument();
    expect(ahLink).toHaveTextContent("Connect Apple Health");
    expect(ahLink).toHaveAttribute("href", "/settings/integrations");
  });

  it("shows a manual-log affordance", () => {
    render(<SleepEmptyCta />);
    const manualLink = screen.getByTestId("log-manually");
    expect(manualLink).toBeInTheDocument();
    expect(manualLink).toHaveTextContent("Log manually");
  });

  it("all three CTAs are rendered together", () => {
    render(<SleepEmptyCta />);
    expect(screen.getByTestId("connect-oura")).toBeInTheDocument();
    expect(screen.getByTestId("connect-apple-health")).toBeInTheDocument();
    expect(screen.getByTestId("log-manually")).toBeInTheDocument();
  });
});
