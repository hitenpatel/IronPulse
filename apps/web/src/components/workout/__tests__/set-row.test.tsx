import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    workout: {
      updateSet: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

vi.mock("@/hooks/use-data-mode", () => ({
  useDataMode: () => "trpc",
}));

vi.mock("@powersync/react", () => ({
  PowerSyncContext: { Consumer: ({ children }: any) => children(null) },
}));

import { SetRow } from "../set-row";

const baseProps = {
  setId: "set-1",
  setNumber: 1,
  weightKg: null,
  reps: null,
  rpe: null,
  completed: false,
  onCompleted: vi.fn(),
  onMutationSuccess: vi.fn(),
};

describe("SetRow — plate breakdown (AC 1–4)", () => {
  it("does not show plates toggle for non-barbell exercises", () => {
    render(<SetRow {...baseProps} weightKg={60} isBarbell={false} />);
    expect(screen.queryByRole("button", { name: /plate/i })).toBeNull();
  });

  it("does not show plates toggle when weight is empty, even for barbell", () => {
    render(<SetRow {...baseProps} weightKg={null} isBarbell={true} />);
    expect(screen.queryByRole("button", { name: /plate/i })).toBeNull();
  });

  it("shows plates toggle for a barbell exercise with weight set", () => {
    render(<SetRow {...baseProps} weightKg={100} isBarbell={true} />);
    expect(
      screen.getByRole("button", { name: /show plate breakdown/i })
    ).toBeInTheDocument();
  });

  it("reveals per-side breakdown when plates toggle is clicked", () => {
    render(<SetRow {...baseProps} weightKg={100} isBarbell={true} />);
    fireEvent.click(screen.getByRole("button", { name: /show plate breakdown/i }));
    // 100kg total: (100 - 20) / 2 = 40kg per side → 25kg×1 + 15kg×1 (greedy)
    expect(screen.getByTestId("plate-breakdown-1")).toHaveTextContent("25kg×1");
    expect(screen.getByTestId("plate-breakdown-1")).toHaveTextContent("15kg×1");
  });

  it("hides breakdown when toggle is clicked a second time", () => {
    render(<SetRow {...baseProps} weightKg={100} isBarbell={true} />);
    const btn = screen.getByRole("button", { name: /show plate breakdown/i });
    fireEvent.click(btn);
    expect(screen.getByTestId("plate-breakdown-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /hide plate breakdown/i }));
    expect(screen.queryByTestId("plate-breakdown-1")).toBeNull();
  });

  it("computes correct plates for a standard 90 kg squat", () => {
    // 90 kg total: (90 - 20) / 2 = 35 kg per side → 25kg×1 + 10kg×1
    render(<SetRow {...baseProps} weightKg={90} isBarbell={true} />);
    fireEvent.click(screen.getByRole("button", { name: /show plate breakdown/i }));
    const el = screen.getByTestId("plate-breakdown-1");
    expect(el).toHaveTextContent("25kg×1");
    expect(el).toHaveTextContent("10kg×1");
  });

  it("shows 'bar only' when weight equals bar weight (20 kg)", () => {
    render(<SetRow {...baseProps} weightKg={20} isBarbell={true} />);
    fireEvent.click(screen.getByRole("button", { name: /show plate breakdown/i }));
    expect(screen.getByTestId("plate-breakdown-1")).toHaveTextContent("bar only");
  });
});
