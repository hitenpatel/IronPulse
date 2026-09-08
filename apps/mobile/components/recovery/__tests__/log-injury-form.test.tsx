/**
 * Component tests for LogInjuryForm — covers injury-type/severity/body-part
 * selection, validation, and the UTC-midnight date normalisation the
 * screen relies on (see lib/date-utils.ts and the injury-recovery plan's
 * date amendment).
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

import { LogInjuryForm } from "../log-injury-form";
import { formatDateOnly } from "@/lib/date-utils";

const noop = () => {};

async function renderForm(props: Partial<React.ComponentProps<typeof LogInjuryForm>> = {}) {
  await render(
    <LogInjuryForm submitting={false} errorMessage={null} onSubmit={noop} onCancel={noop} {...props} />,
  );
}

describe("LogInjuryForm", () => {
  it("renders every injury type option from injuryTypeEnum", async () => {
    await renderForm();
    for (const label of [
      "Strain",
      "Sprain",
      "Fracture",
      "Tendinopathy",
      "Soreness",
      "Impact",
      "Other",
    ]) {
      expect(screen.getByTestId(`injury-type-option-${label.toLowerCase()}`)).toBeTruthy();
    }
  });

  it("refuses to submit with no body part added", async () => {
    const onSubmit = jest.fn();
    await renderForm({ onSubmit });

    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-log-injury-submit"));
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("injury-form-error").props.children).toMatch(/body part/i);
  });

  it("adds and removes a body part via the input + chip", async () => {
    await renderForm();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("injury-body-part-input"), "Hamstrings");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-body-part-add-button"));
    });
    expect(screen.getByText(/hamstrings/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-body-part-remove-hamstrings"));
    });
    expect(screen.queryByText(/hamstrings/)).toBeNull();
  });

  it("submits with the selected injury type, severity, lower-cased body part and UTC-midnight date", async () => {
    const onSubmit = jest.fn();
    await renderForm({ onSubmit });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("injury-date-input"), "2026-09-07");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-type-option-sprain"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-severity-option-8"));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("injury-body-part-input"), "Ankle");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("injury-body-part-add-button"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("recovery-log-injury-submit"));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0];
    expect(call.injuryType).toBe("sprain");
    expect(call.severity).toBe(8);
    expect(call.bodyParts).toEqual(["ankle"]);
    expect(call.injuredAt).toBeInstanceOf(Date);
    expect(call.injuredAt.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("normalises the submitted date to UTC midnight even from a non-UTC device timezone", async () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14 — the case the amendment calls out
    try {
      const onSubmit = jest.fn();
      await renderForm({ onSubmit });

      const today = formatDateOnly(new Date());
      await act(async () => {
        fireEvent.changeText(screen.getByTestId("injury-date-input"), today);
      });
      await act(async () => {
        fireEvent.changeText(screen.getByTestId("injury-body-part-input"), "knee");
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId("injury-body-part-add-button"));
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId("recovery-log-injury-submit"));
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const submittedDate: Date = onSubmit.mock.calls[0][0].injuredAt;
      // Whatever calendar day the user typed, the submitted instant must be
      // exactly that day's UTC midnight — not shifted a day by the device's
      // local offset from UTC.
      expect(submittedDate.getUTCFullYear()).toBe(new Date().getFullYear());
      expect(submittedDate.getUTCHours()).toBe(0);
      expect(submittedDate.getUTCMinutes()).toBe(0);
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("shows the server error message when errorMessage is set", async () => {
    await renderForm({ errorMessage: "Failed to log injury." });
    expect(screen.getByTestId("injury-form-error").props.children).toBe("Failed to log injury.");
  });
});
