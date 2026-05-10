import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// ── private helpers inlined from exercises/page.tsx ──────────────────────────
function computeMatchRanges(
  name: string,
  query: string,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();
  let idx = 0;
  while (idx <= nameLower.length - queryLower.length) {
    const found = nameLower.indexOf(queryLower, idx);
    if (found === -1) break;
    ranges.push({ start: found, end: found + queryLower.length });
    idx = found + queryLower.length;
  }
  return ranges;
}

function formatLabel(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function HighlightedName({
  name,
  ranges,
}: {
  name: string;
  ranges: Array<{ start: number; end: number }>;
}) {
  if (!ranges.length) return <>{name}</>;
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const { start, end } of ranges) {
    if (start > pos) parts.push(name.slice(pos, start));
    parts.push(
      <mark key={start} className="bg-transparent font-bold text-primary not-italic">
        {name.slice(start, end)}
      </mark>,
    );
    pos = end;
  }
  if (pos < name.length) parts.push(name.slice(pos));
  return <>{parts}</>;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("computeMatchRanges", () => {
  it("returns empty array when query is not found", () => {
    expect(computeMatchRanges("Bench Press", "curl")).toEqual([]);
  });

  it("finds a match at the start of the name", () => {
    expect(computeMatchRanges("Bench Press", "bench")).toEqual([
      { start: 0, end: 5 },
    ]);
  });

  it("finds a match in the middle of the name", () => {
    expect(computeMatchRanges("Bench Press", "press")).toEqual([
      { start: 6, end: 11 },
    ]);
  });

  it("finds multiple non-overlapping matches", () => {
    expect(computeMatchRanges("ab ab ab", "ab")).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
      { start: 6, end: 8 },
    ]);
  });

  it("is case-insensitive", () => {
    expect(computeMatchRanges("Squat", "SQUAT")).toEqual([
      { start: 0, end: 5 },
    ]);
  });

  it("returns empty array when query is longer than the name", () => {
    expect(computeMatchRanges("ab", "abc")).toEqual([]);
  });

  it("advances past each match so the same position is not re-matched", () => {
    // "aaa" with query "aa" → one match at [0,2], then idx=2 and
    // 2 <= 3-2=1 is false, so loop ends — only one range
    expect(computeMatchRanges("aaa", "aa")).toEqual([{ start: 0, end: 2 }]);
  });

  it("finds a match that is the full name", () => {
    expect(computeMatchRanges("curl", "curl")).toEqual([{ start: 0, end: 4 }]);
  });
});

describe("formatLabel", () => {
  it("capitalises a plain word", () => {
    expect(formatLabel("chest")).toBe("Chest");
  });

  it("converts snake_case to space-separated title case", () => {
    expect(formatLabel("lower_back")).toBe("Lower Back");
  });

  it("handles multi-segment snake_case", () => {
    expect(formatLabel("hip_flexors")).toBe("Hip Flexors");
  });

  it("passes through an already-capitalised word", () => {
    expect(formatLabel("Barbell")).toBe("Barbell");
  });

  it("handles a single character word", () => {
    expect(formatLabel("a")).toBe("A");
  });
});

describe("HighlightedName", () => {
  it("renders the name as plain text when ranges is empty", () => {
    render(<HighlightedName name="Bench Press" ranges={[]} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(document.querySelector("mark")).toBeNull();
  });

  it("wraps the matched slice in a mark element", () => {
    render(
      <HighlightedName name="Bench Press" ranges={[{ start: 0, end: 5 }]} />,
    );
    const mark = document.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe("Bench");
  });

  it("renders the unmatched suffix after the mark", () => {
    const { container } = render(
      <HighlightedName name="Bench Press" ranges={[{ start: 0, end: 5 }]} />,
    );
    expect(container.textContent).toBe("Bench Press");
  });

  it("renders a mark for a mid-string match with correct surrounding text", () => {
    const { container } = render(
      <HighlightedName name="Bench Press" ranges={[{ start: 6, end: 11 }]} />,
    );
    const mark = document.querySelector("mark");
    expect(mark!.textContent).toBe("Press");
    expect(container.textContent).toBe("Bench Press");
  });

  it("renders multiple marks for multiple ranges", () => {
    render(
      <HighlightedName
        name="ab ab ab"
        ranges={[
          { start: 0, end: 2 },
          { start: 3, end: 5 },
          { start: 6, end: 8 },
        ]}
      />,
    );
    const marks = document.querySelectorAll("mark");
    expect(marks).toHaveLength(3);
    marks.forEach((m) => expect(m.textContent).toBe("ab"));
  });

  it("renders a mark for a full-name match with no surrounding text", () => {
    const { container } = render(
      <HighlightedName name="curl" ranges={[{ start: 0, end: 4 }]} />,
    );
    const mark = document.querySelector("mark");
    expect(mark!.textContent).toBe("curl");
    expect(container.textContent).toBe("curl");
  });
});
