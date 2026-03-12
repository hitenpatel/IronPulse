import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GITHUB_TREE_API =
  "https://api.github.com/repos/wrkout/exercises.json/git/trees/master?recursive=1";
const RAW_BASE =
  "https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises";

interface WrkoutExercise {
  name: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface MappedExercise {
  name: string;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string | null;
  imageUrls: string[];
  videoUrls: string[];
  isCustom: boolean;
  createdById: null;
}

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  kettlebells: "kettlebell",
  machine: "machine",
  cable: "cable",
  "body only": "bodyweight",
  bands: "band",
  "exercise ball": "other",
  "medicine ball": "other",
  "foam roll": "other",
  "e-z curl bar": "barbell",
  other: "other",
};

const MECHANIC_MAP: Record<string, string> = {
  compound: "compound",
  isolation: "isolation",
};

async function download() {
  console.log("Fetching repo tree...");
  const treeRes = await fetch(GITHUB_TREE_API);
  const tree = (await treeRes.json()) as {
    tree: Array<{ path: string; type: string }>;
  };

  // Find all exercise.json paths
  const exercisePaths = tree.tree
    .filter(
      (f) =>
        f.type === "blob" && /^exercises\/[^/]+\/exercise\.json$/.test(f.path)
    )
    .map((f) => f.path);

  console.log(`Found ${exercisePaths.length} exercises`);

  const exercises: MappedExercise[] = [];
  let failed = 0;

  for (const exPath of exercisePaths) {
    const dirName = exPath.split("/")[1]!;
    try {
      const res = await fetch(
        `${RAW_BASE}/${encodeURIComponent(dirName)}/exercise.json`
      );
      if (!res.ok) {
        failed++;
        continue;
      }
      const raw = (await res.json()) as WrkoutExercise;

      const imageUrls = [0, 1].map(
        (i) =>
          `${RAW_BASE}/${encodeURIComponent(dirName)}/images/${i}.jpg`
      );

      exercises.push({
        name: raw.name,
        category: raw.mechanic
          ? MECHANIC_MAP[raw.mechanic] ?? "compound"
          : "compound",
        primaryMuscles: raw.primaryMuscles ?? [],
        secondaryMuscles: raw.secondaryMuscles ?? [],
        equipment: raw.equipment
          ? EQUIPMENT_MAP[raw.equipment.toLowerCase()] ?? null
          : null,
        instructions: raw.instructions?.join("\n") ?? null,
        imageUrls,
        videoUrls: [],
        isCustom: false,
        createdById: null,
      });

      process.stdout.write(".");
    } catch {
      failed++;
    }
  }

  console.log(`\nConverted ${exercises.length} exercises (${failed} failed)`);

  fs.writeFileSync(
    path.join(__dirname, "exercises.json"),
    JSON.stringify(exercises, null, 2)
  );
  console.log("Written to seeds/exercises.json");
}

download();
