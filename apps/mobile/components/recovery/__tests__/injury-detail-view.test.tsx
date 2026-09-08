/**
 * Component tests for InjuryDetailView — injury summary, the recovery
 * timeline, the log-recovery-activity form, and the status control.
 * (screen wrapper `app/recovery/injury-detail.tsx` fetches via trpc and
 * passes it in as props; this test never touches trpc.)
 */
import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react-native";

jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  const React = require("react");
  return new Proxy(
    {},
    { get: () => () => React.createElement(View, null) },
  );
});

import { InjuryDetailView } from "../injury-detail-view";
import type { InjurySummary, RecoveryActivitySummary } from "../types";
import { formatDateOnly } from "@/lib/date-utils";

const noop = () => {};

function makeInjury(overrides: Partial<InjurySummary> = {}): InjurySummary {
  return {
    id: "inj-1",
    injuredAt: new Date("2026-08-01T00:00:00.000Z"),
    injuryType: "strain",
    severity: 6,
    bodyParts: ["hamstrings"],
    status: "active",
    notes: null,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<RecoveryActivitySummary> = {}): RecoveryActivitySummary {
  return {
    id: "act-1",
    injuryId: "inj-1",
    performedAt: new Date("2026-08-03T00:00:00.000Z"),
    modality: "ice",
    durationMins: null,
    notes: null,
    ...overrides,
  };
}

async function renderDetail(props: Partial<React.ComponentProps<typeof InjuryDetailView>> = {}) {
  await render(
    <InjuryDetailView
      injury={makeInjury()}
      loading={false}
      error={false}
      onBack={noop}
      onRetry={noop}
      activities={[]}
      activitiesLoading={false}
      loggingActivity={false}
      activityError={null}
      onLogRecoveryActivity={noop}
      updatingStatus={false}
      onChangeStatus={noop}
      {...props}
    />,
  );
}

describe("InjuryDetailView", () => {
  it("renders the injury summary", async () => {
    await renderDetail();
    expect(screen.getByTestId("injury-detail-summary")).toBeTruthy();
    expect(screen.getByText("Severity 6/10")).toBeTruthy();
    expect(screen.getByText("Hamstrings")).toBeTruthy();
  });

  it("renders an error state and no summary when loading failed", async () => {
    await renderDetail({ error: true, injury: null });
    expect(screen.queryByTestId("injury-detail-summary")).toBeNull();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("renders the recovery timeline in the order provided, newest first", async () => {
    const activities = [
      makeActivity({ id: "act-2", modality: "mobility", performedAt: new Date("2026-08-05") }),
      makeActivity({ id: "act-1", modality: "ice", performedAt: new Date("2026-08-02") }),
    ];
    await renderDetail({ activities });

    expect(screen.getByTestId("recovery-timeline")).toBeTruthy();
    const row2 = screen.getByTestId("recovery-activity-row-act-2");
    const row1 = screen.getByTestId("recovery-activity-row-act-1");
    expect(within(row2).getByText("Mobility")).toBeTruthy();
    expect(within(row1).getByText("Ice")).toBeTruthy();
  });

  it("shows a message instead of the timeline when there is no recovery activity", async () => {
    await renderDetail({ activities: [] });
    expect(screen.queryByTestId("recovery-timeline")).toBeNull();
    expect(screen.getByText("No recovery activity logged yet.")).toBeTruthy();
  });

  it("only shows the status control for statuses the injury is not already in", async () => {
    await renderDetail({ injury: makeInjury({ status: "active" }) });
    expect(screen.getByTestId("injury-status-recovering")).toBeTruthy();
    expect(screen.getByTestId("injury-status-resolved")).toBeTruthy();

    await renderDetail({ injury: makeInjury({ status: "resolved" }) });
    expect(screen.queryByTestId("injury-status-resolved")).toBeNull();
  });

  it("calls onChangeStatus when marking recovering / resolved", async () => {
    const onChangeStatus = jest.fn();
    await renderDetail({ onChangeStatus });

    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-status-recovering"));
    });
    expect(onChangeStatus).toHaveBeenCalledWith("recovering");

    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-status-resolved"));
    });
    expect(onChangeStatus).toHaveBeenCalledWith("resolved");
  });

  it("submits a recovery activity with modality, duration, notes and a UTC-midnight date", async () => {
    const onLogRecoveryActivity = jest.fn();
    await renderDetail({ onLogRecoveryActivity });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("recovery-activity-date"), "2026-09-07");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-activity-modality-option-physical_therapy"));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("recovery-activity-duration"), "45");
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("recovery-activity-notes"), "felt looser");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-log-activity-submit"));
    });

    expect(onLogRecoveryActivity).toHaveBeenCalledTimes(1);
    const call = onLogRecoveryActivity.mock.calls[0][0];
    expect(call.modality).toBe("physical_therapy");
    expect(call.durationMins).toBe(45);
    expect(call.notes).toBe("felt looser");
    expect(call.performedAt.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("normalises the recovery activity date from a non-UTC device timezone", async () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati";
    try {
      const onLogRecoveryActivity = jest.fn();
      await renderDetail({ onLogRecoveryActivity });

      const today = formatDateOnly(new Date());
      await act(async () => {
        fireEvent.changeText(screen.getByTestId("recovery-activity-date"), today);
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId("recovery-log-activity-submit"));
      });

      expect(onLogRecoveryActivity).toHaveBeenCalledTimes(1);
      const performedAt: Date = onLogRecoveryActivity.mock.calls[0][0].performedAt;
      expect(performedAt.getUTCHours()).toBe(0);
      expect(performedAt.getUTCMinutes()).toBe(0);
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("renders user-authored notes as-is without app-added commentary", async () => {
    await renderDetail({ injury: makeInjury({ notes: "twisted it landing a jump" }) });
    expect(screen.getByText("twisted it landing a jump")).toBeTruthy();
  });
});
