import { describe, it, expect } from "vitest";
import {
  MAX_SHORT_NAME,
  MAX_MEDIUM_STRING,
  MAX_LONG_TEXT,
  MAX_TOKEN,
  MAX_SEARCH,
  shortName,
  mediumString,
  longText,
  tokenString,
  searchString,
} from "../schemas/limits";

describe("limit constants", () => {
  it("MAX_SHORT_NAME is 100", () => {
    expect(MAX_SHORT_NAME).toBe(100);
  });

  it("MAX_MEDIUM_STRING is 500", () => {
    expect(MAX_MEDIUM_STRING).toBe(500);
  });

  it("MAX_LONG_TEXT is 2000", () => {
    expect(MAX_LONG_TEXT).toBe(2000);
  });

  it("MAX_TOKEN is 512", () => {
    expect(MAX_TOKEN).toBe(512);
  });

  it("MAX_SEARCH is 200", () => {
    expect(MAX_SEARCH).toBe(200);
  });
});

describe("shortName()", () => {
  it("accepts a normal name", () => {
    expect(shortName().safeParse("Bench Press").success).toBe(true);
  });

  it("accepts a string exactly at the max length", () => {
    expect(shortName().safeParse("a".repeat(MAX_SHORT_NAME)).success).toBe(true);
  });

  it("rejects a string one character over the max", () => {
    expect(shortName().safeParse("a".repeat(MAX_SHORT_NAME + 1)).success).toBe(false);
  });

  it("rejects an empty string (min 1)", () => {
    expect(shortName().safeParse("").success).toBe(false);
  });
});

describe("mediumString()", () => {
  it("accepts a sentence", () => {
    expect(mediumString().safeParse("A short bio.").success).toBe(true);
  });

  it("accepts a string exactly at the max length", () => {
    expect(mediumString().safeParse("x".repeat(MAX_MEDIUM_STRING)).success).toBe(true);
  });

  it("rejects a string one character over the max", () => {
    expect(mediumString().safeParse("x".repeat(MAX_MEDIUM_STRING + 1)).success).toBe(false);
  });

  it("rejects an empty string (min 1)", () => {
    expect(mediumString().safeParse("").success).toBe(false);
  });
});

describe("longText()", () => {
  it("accepts a paragraph", () => {
    expect(longText().safeParse("Some free-form notes.").success).toBe(true);
  });

  it("accepts an empty string (no min)", () => {
    expect(longText().safeParse("").success).toBe(true);
  });

  it("accepts a string exactly at the max length", () => {
    expect(longText().safeParse("z".repeat(MAX_LONG_TEXT)).success).toBe(true);
  });

  it("rejects a string one character over the max", () => {
    expect(longText().safeParse("z".repeat(MAX_LONG_TEXT + 1)).success).toBe(false);
  });
});

describe("tokenString()", () => {
  it("accepts a typical opaque token", () => {
    expect(tokenString().safeParse("abc123xyz").success).toBe(true);
  });

  it("accepts a string exactly at the max length", () => {
    expect(tokenString().safeParse("t".repeat(MAX_TOKEN)).success).toBe(true);
  });

  it("rejects a string one character over the max", () => {
    expect(tokenString().safeParse("t".repeat(MAX_TOKEN + 1)).success).toBe(false);
  });

  it("rejects an empty string (min 1)", () => {
    expect(tokenString().safeParse("").success).toBe(false);
  });
});

describe("searchString()", () => {
  it("accepts a typical search query", () => {
    expect(searchString().safeParse("squat").success).toBe(true);
  });

  it("accepts an empty string (no min)", () => {
    expect(searchString().safeParse("").success).toBe(true);
  });

  it("accepts a string exactly at the max length", () => {
    expect(searchString().safeParse("q".repeat(MAX_SEARCH)).success).toBe(true);
  });

  it("rejects a string one character over the max", () => {
    expect(searchString().safeParse("q".repeat(MAX_SEARCH + 1)).success).toBe(false);
  });
});
