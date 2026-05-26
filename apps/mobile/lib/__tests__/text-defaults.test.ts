import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Text: {},
  TextInput: {},
}));

import { Text, TextInput } from "react-native";
import { configureTextDefaults } from "../text-defaults";

beforeEach(() => {
  delete (Text as any).defaultProps;
  delete (TextInput as any).defaultProps;
});

describe("configureTextDefaults", () => {
  it("sets maxFontSizeMultiplier to 1.3 on Text", () => {
    configureTextDefaults();
    expect((Text as any).defaultProps.maxFontSizeMultiplier).toBe(1.3);
  });

  it("sets maxFontSizeMultiplier to 1.3 on TextInput", () => {
    configureTextDefaults();
    expect((TextInput as any).defaultProps.maxFontSizeMultiplier).toBe(1.3);
  });

  it("creates defaultProps on Text when absent", () => {
    expect((Text as any).defaultProps).toBeUndefined();
    configureTextDefaults();
    expect((Text as any).defaultProps).toBeDefined();
  });

  it("creates defaultProps on TextInput when absent", () => {
    expect((TextInput as any).defaultProps).toBeUndefined();
    configureTextDefaults();
    expect((TextInput as any).defaultProps).toBeDefined();
  });

  it("preserves existing defaultProps on Text", () => {
    (Text as any).defaultProps = { allowFontScaling: false };
    configureTextDefaults();
    expect((Text as any).defaultProps.allowFontScaling).toBe(false);
    expect((Text as any).defaultProps.maxFontSizeMultiplier).toBe(1.3);
  });

  it("preserves existing defaultProps on TextInput", () => {
    (TextInput as any).defaultProps = { editable: true };
    configureTextDefaults();
    expect((TextInput as any).defaultProps.editable).toBe(true);
    expect((TextInput as any).defaultProps.maxFontSizeMultiplier).toBe(1.3);
  });

  it("applies the same multiplier cap to both Text and TextInput", () => {
    configureTextDefaults();
    expect((Text as any).defaultProps.maxFontSizeMultiplier).toBe(
      (TextInput as any).defaultProps.maxFontSizeMultiplier,
    );
  });
});
