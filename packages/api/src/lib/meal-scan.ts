export interface FoodItem {
  name: string;
  portionDescription: string;
}

export interface MacroPrediction {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isMacroEstimate: boolean;
}

export interface ScanResult {
  items: FoodItem[];
  macros: MacroPrediction;
}

interface ClarifaiConcept {
  name: string;
  value: number;
}

interface ClarifaiResponse {
  outputs?: Array<{
    data?: { concepts?: ClarifaiConcept[] };
  }>;
}

const CLARIFAI_MODEL_URL =
  "https://api.clarifai.com/v2/models/bd367be194cf45149e75f01d59f77ba7/outputs";

const CONFIDENCE_THRESHOLD = 0.7;
const MAX_ITEMS = 5;
const CALORIES_PER_ITEM = 200;

export async function runMealScan(imageUrl: string): Promise<ScanResult> {
  const apiKey = process.env.MEAL_SCAN_API_KEY;
  if (!apiKey) {
    throw new Error("MEAL_SCAN_API_KEY is not configured");
  }

  const res = await fetch(CLARIFAI_MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [{ data: { image: { url: imageUrl } } }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Clarifai API error: ${res.status}`);
  }

  const data = (await res.json()) as ClarifaiResponse;
  const concepts = data.outputs?.[0]?.data?.concepts ?? [];

  const items: FoodItem[] = concepts
    .filter((c) => c.value >= CONFIDENCE_THRESHOLD)
    .slice(0, MAX_ITEMS)
    .map((c) => ({ name: c.name, portionDescription: "1 serving" }));

  return {
    items,
    macros: {
      calories: items.length * CALORIES_PER_ITEM,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      isMacroEstimate: true,
    },
  };
}
