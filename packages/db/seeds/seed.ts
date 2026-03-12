import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new PrismaClient();

interface SeedExercise {
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

async function seed() {
  const raw = fs.readFileSync(path.join(__dirname, "exercises.json"), "utf-8");
  const exercises: SeedExercise[] = JSON.parse(raw);

  console.log(`Seeding ${exercises.length} exercises...`);

  let created = 0;
  let updated = 0;

  for (const ex of exercises) {
    const existing = await db.exercise.findFirst({
      where: { name: ex.name, isCustom: false },
    });

    if (existing) {
      await db.exercise.update({
        where: { id: existing.id },
        data: {
          category: ex.category,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles,
          equipment: ex.equipment,
          instructions: ex.instructions,
          imageUrls: ex.imageUrls,
          videoUrls: ex.videoUrls,
        },
      });
      updated++;
    } else {
      await db.exercise.create({ data: ex });
      created++;
    }
  }

  console.log(`Seed complete: ${created} created, ${updated} updated`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
