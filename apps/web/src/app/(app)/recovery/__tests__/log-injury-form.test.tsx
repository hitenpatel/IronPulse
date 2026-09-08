import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mutateMock = vi.fn();
const invalidateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ injury: { list: { invalidate: invalidateMock } } }),
    injury: {
      log: {
        useMutation: () => ({
          mutate: (input: unknown) => mutateMock(input),
          isPending: false,
        }),
      },
    },
  },
}));

import { LogInjuryForm } from "../log-injury-form";

const INJURY_TYPE_LABELS = [
  "Strain",
  "Sprain",
  "Fracture",
  "Tendinopathy",
  "Soreness",
  "Impact",
  "Other",
];

beforeEach(() => {
  mutateMock.mockClear();
  invalidateMock.mockClear();
});

describe("LogInjuryForm", () => {
  it("renders every injury type option", () => {
    render(<LogInjuryForm />);
    for (const label of INJURY_TYPE_LABELS) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
  });

  it("refuses to submit with no body part selected", () => {
    render(<LogInjuryForm />);
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log injury/i }));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/at least one body part/i)).toBeInTheDocument();
  });

  it("refuses a severity outside 1-10", () => {
    render(<LogInjuryForm />);
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-09-01" },
    });
    const bodyPartInput = screen.getByLabelText(/body part/i);
    fireEvent.change(bodyPartInput, { target: { value: "hamstrings" } });
    fireEvent.keyDown(bodyPartInput, { key: "Enter" });
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: "11" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log injury/i }));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/between 1 and 10/i)).toBeInTheDocument();
  });

  it("calls the mutation once with the exact payload on a valid submit", () => {
    render(<LogInjuryForm />);
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText(/injury type/i), {
      target: { value: "sprain" },
    });
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: "6" },
    });
    const bodyPartInput = screen.getByLabelText(/body part/i);
    fireEvent.change(bodyPartInput, { target: { value: "Ankle" } });
    fireEvent.keyDown(bodyPartInput, { key: "Enter" });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "twisted on a run" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log injury/i }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith({
      injuredAt: new Date("2026-09-01T00:00:00.000Z"),
      injuryType: "sprain",
      severity: 6,
      bodyParts: ["ankle"],
      notes: "twisted on a run",
    });
  });

  it("normalises a non-UTC-midnight-literal date input to UTC midnight", () => {
    // Regression for the date-truncation amendment: the date picker only
    // ever emits a plain "YYYY-MM-DD" string, but the submitted Date must
    // still be UTC midnight for it, not local midnight.
    render(<LogInjuryForm />);
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-01-15" },
    });
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: "3" },
    });
    const bodyPartInput = screen.getByLabelText(/body part/i);
    fireEvent.change(bodyPartInput, { target: { value: "knee" } });
    fireEvent.keyDown(bodyPartInput, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /log injury/i }));

    const call = mutateMock.mock.calls[0][0];
    expect(call.injuredAt.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
});
