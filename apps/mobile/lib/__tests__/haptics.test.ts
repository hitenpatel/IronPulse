import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
} from "../haptics";

const mockTrigger = vi.fn();

vi.mock("react-native-haptic-feedback", () => ({
  default: { trigger: mockTrigger },
}));

// haptics.ts uses dynamic require() inside a try-catch — in ESM the require
// call throws a ReferenceError that is silently swallowed, so the mock above
// cannot intercept the native-module path. The tests below cover what IS
// observable from outside: correct enum constants and the async contract of
// each exported function.

beforeEach(() => {
  mockTrigger.mockReset();
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

describe("impactAsync", () => {
  it("returns a Promise when called with Light", () => {
    const result = impactAsync(ImpactFeedbackStyle.Light);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("returns a Promise when called with Medium", () => {
    const result = impactAsync(ImpactFeedbackStyle.Medium);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("returns a Promise when called with Heavy", () => {
    const result = impactAsync(ImpactFeedbackStyle.Heavy);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("resolves to undefined (void return contract)", async () => {
    const result = await impactAsync(ImpactFeedbackStyle.Medium);
    expect(result).toBeUndefined();
  });

  it("resolves to undefined when called with no argument (default param)", async () => {
    const result = await impactAsync();
    expect(result).toBeUndefined();
  });
});

describe("notificationAsync", () => {
  it("returns a Promise when called with Success", () => {
    const result = notificationAsync(NotificationFeedbackType.Success);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("returns a Promise when called with Warning", () => {
    const result = notificationAsync(NotificationFeedbackType.Warning);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("returns a Promise when called with Error", () => {
    const result = notificationAsync(NotificationFeedbackType.Error);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("resolves to undefined (void return contract)", async () => {
    const result = await notificationAsync(NotificationFeedbackType.Success);
    expect(result).toBeUndefined();
  });

  it("resolves to undefined when called with no argument (default param)", async () => {
    const result = await notificationAsync();
    expect(result).toBeUndefined();
  });
});

describe("selectionAsync", () => {
  it("returns a Promise", () => {
    const result = selectionAsync();
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("resolves to undefined (void return contract)", async () => {
    const result = await selectionAsync();
    expect(result).toBeUndefined();
  });

  it("can be called multiple times without state bleed", async () => {
    const results = await Promise.all([selectionAsync(), selectionAsync()]);
    expect(results).toEqual([undefined, undefined]);
  });
});
