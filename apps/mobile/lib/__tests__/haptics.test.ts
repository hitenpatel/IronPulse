import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
} from "../haptics";

// haptics.ts calls `require("react-native-haptic-feedback")` at invocation
// time, inside a try/catch. Under ESM there is no global `require`, so the
// call throws ReferenceError and the trigger is silently swallowed. Follow
// the same pattern as notifications.test.ts: stub a global `require` before
// each test that returns a fake haptic module. When the stub is removed the
// no-op fallback branch is exercised instead.

const trigger = vi.fn();

function installRequireStub(triggerFn: (type: string) => void = trigger) {
  vi.stubGlobal("require", (id: string) => {
    if (id === "react-native-haptic-feedback") {
      return { default: { trigger: triggerFn } };
    }
    throw new Error(`unexpected require in test: ${id}`);
  });
}

beforeEach(() => {
  trigger.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ImpactFeedbackStyle", () => {
  it("Light maps to the string 'Light'", () => {
    expect(ImpactFeedbackStyle.Light).toBe("Light");
  });
  it("Medium maps to the string 'Medium'", () => {
    expect(ImpactFeedbackStyle.Medium).toBe("Medium");
  });
  it("Heavy maps to the string 'Heavy'", () => {
    expect(ImpactFeedbackStyle.Heavy).toBe("Heavy");
  });
  it("has exactly three members", () => {
    const keys = Object.keys(ImpactFeedbackStyle);
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(
      expect.arrayContaining(["Light", "Medium", "Heavy"]),
    );
  });
});

describe("NotificationFeedbackType", () => {
  it("Success maps to the string 'Success'", () => {
    expect(NotificationFeedbackType.Success).toBe("Success");
  });
  it("Warning maps to the string 'Warning'", () => {
    expect(NotificationFeedbackType.Warning).toBe("Warning");
  });
  it("Error maps to the string 'Error'", () => {
    expect(NotificationFeedbackType.Error).toBe("Error");
  });
  it("has exactly three members", () => {
    const keys = Object.keys(NotificationFeedbackType);
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(
      expect.arrayContaining(["Success", "Warning", "Error"]),
    );
  });
});

describe("impactAsync trigger mapping", () => {
  it("Light -> impactLight", async () => {
    installRequireStub();
    await impactAsync(ImpactFeedbackStyle.Light);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("impactLight");
  });

  it("Medium -> impactMedium", async () => {
    installRequireStub();
    await impactAsync(ImpactFeedbackStyle.Medium);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("impactMedium");
  });

  it("Heavy -> impactHeavy", async () => {
    installRequireStub();
    await impactAsync(ImpactFeedbackStyle.Heavy);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("impactHeavy");
  });

  it("no argument defaults to impactMedium", async () => {
    installRequireStub();
    await impactAsync();
    expect(trigger).toHaveBeenCalledExactlyOnceWith("impactMedium");
  });

  it("unknown style falls back to impactMedium", async () => {
    installRequireStub();
    await impactAsync("Bogus" as ImpactFeedbackStyle);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("impactMedium");
  });

  it("returns a Promise", () => {
    installRequireStub();
    const result = impactAsync(ImpactFeedbackStyle.Light);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("resolves to undefined (void return contract)", async () => {
    installRequireStub();
    const result = await impactAsync(ImpactFeedbackStyle.Medium);
    expect(result).toBeUndefined();
  });
});

describe("notificationAsync trigger mapping", () => {
  it("Success -> notificationSuccess", async () => {
    installRequireStub();
    await notificationAsync(NotificationFeedbackType.Success);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("notificationSuccess");
  });

  it("Warning -> notificationWarning", async () => {
    installRequireStub();
    await notificationAsync(NotificationFeedbackType.Warning);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("notificationWarning");
  });

  it("Error -> notificationError", async () => {
    installRequireStub();
    await notificationAsync(NotificationFeedbackType.Error);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("notificationError");
  });

  it("no argument defaults to notificationSuccess", async () => {
    installRequireStub();
    await notificationAsync();
    expect(trigger).toHaveBeenCalledExactlyOnceWith("notificationSuccess");
  });

  it("unknown type falls back to notificationSuccess", async () => {
    installRequireStub();
    await notificationAsync("Bogus" as NotificationFeedbackType);
    expect(trigger).toHaveBeenCalledExactlyOnceWith("notificationSuccess");
  });

  it("returns a Promise", () => {
    installRequireStub();
    const result = notificationAsync(NotificationFeedbackType.Success);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });
});

describe("selectionAsync trigger mapping", () => {
  it("triggers 'selection'", async () => {
    installRequireStub();
    await selectionAsync();
    expect(trigger).toHaveBeenCalledExactlyOnceWith("selection");
  });

  it("returns a Promise", () => {
    installRequireStub();
    const result = selectionAsync();
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("can be called multiple times without state bleed", async () => {
    installRequireStub();
    await Promise.all([selectionAsync(), selectionAsync()]);
    expect(trigger).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveBeenNthCalledWith(1, "selection");
    expect(trigger).toHaveBeenNthCalledWith(2, "selection");
  });
});

describe("no-op fallback when native module unavailable", () => {
  it("impactAsync silently no-ops when require is not defined", async () => {
    // No stub installed — global require is undefined in ESM, so tryTrigger
    // catches ReferenceError and returns without touching the native module.
    await expect(impactAsync(ImpactFeedbackStyle.Medium)).resolves.toBeUndefined();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("notificationAsync silently no-ops when require is not defined", async () => {
    await expect(
      notificationAsync(NotificationFeedbackType.Success),
    ).resolves.toBeUndefined();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("selectionAsync silently no-ops when require is not defined", async () => {
    await expect(selectionAsync()).resolves.toBeUndefined();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("swallows errors thrown by the native trigger call", async () => {
    installRequireStub(() => {
      throw new Error("native module blew up");
    });
    await expect(impactAsync(ImpactFeedbackStyle.Heavy)).resolves.toBeUndefined();
  });

  it("tolerates a haptic module with no trigger function (optional chaining)", async () => {
    vi.stubGlobal("require", (id: string) => {
      if (id === "react-native-haptic-feedback") return { default: {} };
      throw new Error(`unexpected require in test: ${id}`);
    });
    await expect(impactAsync(ImpactFeedbackStyle.Light)).resolves.toBeUndefined();
  });
});
