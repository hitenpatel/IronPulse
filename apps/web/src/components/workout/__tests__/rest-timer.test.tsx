import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RestTimer } from "../rest-timer";

describe("RestTimer", () => {
  it("renders countdown when running", () => {
    render(
      <RestTimer
        running={true}
        remainingSeconds={45}
        onTick={vi.fn()}
        onSkip={vi.fn()}
        onAdjust={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  it("shows skip button", () => {
    render(
      <RestTimer
        running={true}
        remainingSeconds={30}
        onTick={vi.fn()}
        onSkip={vi.fn()}
        onAdjust={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("renders nothing when not running", () => {
    render(
      <RestTimer
        running={false}
        remainingSeconds={30}
        onTick={vi.fn()}
        onSkip={vi.fn()}
        onAdjust={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("shows adjust buttons", () => {
    render(
      <RestTimer
        running={true}
        remainingSeconds={60}
        onTick={vi.fn()}
        onSkip={vi.fn()}
        onAdjust={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /subtract 15 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add 15 seconds/i })).toBeInTheDocument();
  });

  it("formats time with leading zero on seconds", () => {
    render(
      <RestTimer
        running={true}
        remainingSeconds={65}
        onTick={vi.fn()}
        onSkip={vi.fn()}
        onAdjust={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });
});
