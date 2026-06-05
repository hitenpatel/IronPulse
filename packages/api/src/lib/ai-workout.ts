import { logger } from "./logger";

interface AiExercise {
  name: string;
  sets: number;
  reps: number;
  notes: string;
}

interface AiWorkoutResponse {
  workoutName: string;
  exercises: AiExercise[];
}

const DEFAULT_PROMPT_TEMPLATE = `Generate a {{goal}} workout for a {{experienceLevel}} athlete with access to: {{equipment}}.

Respond with a JSON object in this exact format:
{
  "workoutName": "string",
  "exercises": [
    {
      "name": "exercise name",
      "sets": number,
      "reps": number,
      "notes": "coaching cue or note"
    }
  ]
}

Rules:
- Include 4–6 exercises appropriate for the goal and experience level
- Use only the provided equipment
- Keep exercise names standard (e.g. "Barbell Back Squat", "Dumbbell Romanian Deadlift")
- For strength: 3–5 sets, 3–6 reps; for hypertrophy: 3–4 sets, 8–12 reps; for endurance: 2–3 sets, 15–20 reps
- Notes should be concise coaching cues (max 100 chars)`;

export async function generateWorkoutWithAi(params: {
  goal: string;
  experienceLevel: string;
  equipment: string[];
  apiKey: string;
  model: string;
  promptTemplate?: string;
}): Promise<AiWorkoutResponse> {
  const { goal, experienceLevel, equipment, apiKey, model, promptTemplate } = params;

  const template = promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;
  const prompt = template
    .replace("{{goal}}", goal)
    .replace("{{experienceLevel}}", experienceLevel)
    .replace("{{equipment}}", equipment.join(", "));

  logger.info({ goal, experienceLevel, equipment, model, promptTemplate: template }, "ai-workout: generating");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a certified fitness coach. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  let parsed: AiWorkoutResponse;
  try {
    parsed = JSON.parse(content) as AiWorkoutResponse;
  } catch {
    throw new Error("OpenAI returned unexpected JSON structure");
  }

  if (!parsed.workoutName || !Array.isArray(parsed.exercises)) {
    throw new Error("OpenAI returned unexpected JSON structure");
  }

  return parsed;
}
