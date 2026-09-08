/**
 * Component tests for InjuryListView — the presentational injury list
 * (screen wrapper `app/recovery/index.tsx` fetches data via trpc and
 * passes it in as props; this test never touches trpc).
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  const React = require("react");
  return new Proxy(
    {},
    { get: () => () => React.createElement(View, null) },
  );
});

import { InjuryListView } from "../injury-list-view";
import type { InjurySummary } from "../types";

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

const noop = () => {};

async function renderList(props: Partial<React.ComponentProps<typeof InjuryListView>> = {}) {
  await render(
    <InjuryListView
      injuries={[]}
      loading={false}
      error={false}
      bodyPartFilter=""
      onBack={noop}
      onChangeBodyPartFilter={noop}
      onPressInjury={noop}
      onPressLogInjury={noop}
      onRetry={noop}
      {...props}
    />,
  );
}

describe("InjuryListView", () => {
  it("renders both injury types, severities and the list container", async () => {
    const injuries = [
      makeInjury({ id: "inj-1", injuryType: "strain", severity: 6, bodyParts: ["hamstrings"] }),
      makeInjury({ id: "inj-2", injuryType: "sprain", severity: 3, bodyParts: ["ankle"] }),
    ];
    await renderList({ injuries });

    expect(screen.getByTestId("recovery-injury-list")).toBeTruthy();
    expect(screen.getByText("Strain")).toBeTruthy();
    expect(screen.getByText("Sprain")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders the empty state instead of the list when there are no injuries", async () => {
    await renderList({ injuries: [] });

    expect(screen.queryByTestId("recovery-injury-list")).toBeNull();
    expect(screen.getByText("No injuries logged")).toBeTruthy();
  });

  it("renders an error state with a retry action when loading fails", async () => {
    const onRetry = jest.fn();
    await renderList({ error: true, onRetry });

    expect(screen.queryByTestId("recovery-injury-list")).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText("Try again"));
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("tapping a row calls onPressInjury with that injury", async () => {
    const onPressInjury = jest.fn();
    const injuries = [makeInjury({ id: "inj-1" })];
    await renderList({ injuries, onPressInjury });

    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-injury-row-inj-1"));
    });
    expect(onPressInjury).toHaveBeenCalledWith(injuries[0]);
  });

  it("tapping the log-injury button calls onPressLogInjury", async () => {
    const onPressLogInjury = jest.fn();
    await renderList({ onPressLogInjury });

    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-log-injury-button"));
    });
    expect(onPressLogInjury).toHaveBeenCalledTimes(1);
  });

  it("lower-cases the body-part filter before calling onChangeBodyPartFilter", async () => {
    const onChangeBodyPartFilter = jest.fn();
    await renderList({ onChangeBodyPartFilter });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("recovery-body-part-filter"), "Hamstrings");
    });
    expect(onChangeBodyPartFilter).toHaveBeenCalledWith("hamstrings");
  });
});
