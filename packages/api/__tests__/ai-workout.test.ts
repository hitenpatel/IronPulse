import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateWorkoutWithAi } from "../src/lib/ai-workout";

const VALID_RESPONSE = {
  workoutName: "Strength Builder",
  exercises: [
    { name: "Barbell Back Squat", sets: 4, reps: 5, notes: "Keep chest up" },
    { name: "Deadlift", sets: 3, reps: 5, notes: "Brace your core" },
    { name: "Bench Press", sets: 4, reps: 5, notes: "Retract scapulae" },
  ],
};

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const BASE_PARAMS = {
  goal: "strength",
  experienceLevel: "intermediate",
  equipment: ["Barbell"],
  apiKey: "sk-test",
  model: "gpt-4o-mini",
};

describe("generateWorkoutWithAi", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns parsed workout on successful OpenAI response", async () => {
    global.fetch = mockFetch({
      choices: [{ message: { content: JSON.stringify(VALID_RESPONSE) } }],
    });

    const result = await generateWorkoutWithAi(BASE_PARAMS);

    expect(result.workoutName).toBe("Strength Builder");
    expect(result.exercises).toHaveLength(3);
    expect(result.exercises[0]!.name).toBe("Barbell Back Squat");
    expect(result.exercises[0]!.sets).toBe(4);
    expect(result.exercises[0]!.reps).toBe(5);
  });

  it("uses custom prompt template with variable substitution", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(VALID_RESPONSE) } }],
          }),
      };
    });

    await generateWorkoutWithAi({
      ...BASE_PARAMS,
      promptTemplate: "Goal: {{goal}} | Level: {{experienceLevel}} | Equipment: {{equipment}}",
    });

    const messages = capturedBody!["messages"] as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === "user")!;
    expect(userMsg.content).toBe("Goal: strength | Level: intermediate | Equipment: Barbell");
  });

  it("throws on non-OK HTTP response", async () => {
    global.fetch = mockFetch("Unauthorized", 401);

    await expect(generateWorkoutWithAi(BASE_PARAMS)).rejects.toThrow("OpenAI API error 401");
  });

  it("throws when choices array is empty", async () => {
    global.fetch = mockFetch({ choices: [] });

    await expect(generateWorkoutWithAi(BASE_PARAMS)).rejects.toThrow("Empty response from OpenAI");
  });

  it("throws when JSON structure is missing workoutName", async () => {
    global.fetch = mockFetch({
      choices: [{ message: { content: JSON.stringify({ unexpectedKey: true }) } }],
    });

    await expect(generateWorkoutWithAi(BASE_PARAMS)).rejects.toThrow(
      "OpenAI returned unexpected JSON structure",
    );
  });

  it("throws when content is not valid JSON", async () => {
    global.fetch = mockFetch({
      choices: [{ message: { content: "not valid json {{truncated" } }],
    });

    await expect(generateWorkoutWithAi(BASE_PARAMS)).rejects.toThrow(
      "OpenAI returned unexpected JSON structure",
    );
  });

  it("sends the correct model in the request body", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(VALID_RESPONSE) } }],
          }),
      };
    });

    await generateWorkoutWithAi({ ...BASE_PARAMS, model: "gpt-4o" });

    expect(capturedBody!["model"]).toBe("gpt-4o");
  });

  it("includes Authorization header with the api key", async () => {
    let capturedHeaders: Record<string, string> | null = null;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedHeaders = opts.headers as Record<string, string>;
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(VALID_RESPONSE) } }],
          }),
      };
    });

    await generateWorkoutWithAi({ ...BASE_PARAMS, apiKey: "sk-mykey" });

    expect(capturedHeaders!["Authorization"]).toBe("Bearer sk-mykey");
  });
});
