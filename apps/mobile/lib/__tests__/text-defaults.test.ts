import { describe, it, expect, beforeEach, vi } from "vitest";

const { MockText, MockTextInput } = vi.hoisted(() => ({
  MockText: {} as Record<string, unknown>,
  MockTextInput: {} as Record<string, unknown>,
}));

vi.mock("react-native", () => ({
  Text: MockText,
  TextInput: MockTextInput,
}));

import { configureTextDefaults } from "../text-defaults";

beforeEach(() => {
  delete MockText.defaultProps;
  delete MockTextInput.defaultProps;
});

describe("configureTextDefaults", () => {
  it("sets maxFontSizeMultiplier to 1.3 on Text.defaultProps", () => {
    configureTextDefaults();
    expect((MockText.defaultProps as Record<string, unknown>)?.maxFontSizeMultiplier).toBe(1.3);
  });

  it("sets maxFontSizeMultiplier to 1.3 on TextInput.defaultProps", () => {
    configureTextDefaults();
    expect((MockTextInput.defaultProps as Record<string, unknown>)?.maxFontSizeMultiplier).toBe(1.3);
  });

  it("creates Text.defaultProps when it does not already exist", () => {
    expect(MockText.defaultProps).toBeUndefined();
    configureTextDefaults();
    expect(MockText.defaultProps).toBeDefined();
  });

  it("creates TextInput.defaultProps when it does not already exist", () => {
    expect(MockTextInput.defaultProps).toBeUndefined();
    configureTextDefaults();
    expect(MockTextInput.defaultProps).toBeDefined();
  });

  it("preserves existing Text.defaultProps keys when setting maxFontSizeMultiplier", () => {
    MockText.defaultProps = { allowFontScaling: false };
    configureTextDefaults();
    const props = MockText.defaultProps as Record<string, unknown>;
    expect(props.allowFontScaling).toBe(false);
    expect(props.maxFontSizeMultiplier).toBe(1.3);
  });

  it("preserves existing TextInput.defaultProps keys when setting maxFontSizeMultiplier", () => {
    MockTextInput.defaultProps = { autoCorrect: true };
    configureTextDefaults();
    const props = MockTextInput.defaultProps as Record<string, unknown>;
    expect(props.autoCorrect).toBe(true);
    expect(props.maxFontSizeMultiplier).toBe(1.3);
  });

  it("is idempotent — calling twice does not change the cap", () => {
    configureTextDefaults();
    configureTextDefaults();
    expect((MockText.defaultProps as Record<string, unknown>)?.maxFontSizeMultiplier).toBe(1.3);
    expect((MockTextInput.defaultProps as Record<string, unknown>)?.maxFontSizeMultiplier).toBe(1.3);
  });
});
