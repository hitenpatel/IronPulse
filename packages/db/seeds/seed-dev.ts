/**
 * Development seed — creates test users and sample workout/health data
 * Run after the main seed (exercises): pnpm --filter @ironpulse/db db:seed:dev
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = new PrismaClient();

async function seedDev() {
  console.log("Seeding dev environment...");

  const password = await bcrypt.hash("password123", 12);

  // ── Test Users ──
  const users = [
    {
      email: "athlete@test.com",
      name: "Alex Athlete",
      tier: "athlete",
      onboardingComplete: true,
      unitSystem: "metric",
    },
    {
      email: "coach@test.com",
      name: "Chris Coach",
      tier: "coach",
      onboardingComplete: true,
      unitSystem: "metric",
    },
    {
      email: "free@test.com",
      name: "Fiona Free",
      tier: "free",
      onboardingComplete: true,
      unitSystem: "imperial",
    },
    {
      email: "new@test.com",
      name: "Nora New",
      tier: "free",
      onboardingComplete: false,
      unitSystem: "metric",
    },
  ];

  const createdUsers: any[] = [];

  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: password,
        tier: u.tier,
        onboardingComplete: u.onboardingComplete,
        unitSystem: u.unitSystem,
        consentedAt: new Date(),
        accounts: {
          create: {
            provider: "email",
            providerAccountId: u.email,
          },
        },
      },
    });
    createdUsers.push(user);
    console.log(`  User: ${u.email} (${u.tier})`);
  }

  const athlete = createdUsers[0];

  // ── Sample Exercises (pick from seeded library) ──
  const exercises = await db.exercise.findMany({
    where: {
      isCustom: false,
      OR: [
        { name: { contains: "Bench Press" } },
        { name: { contains: "Squat" } },
        { name: { contains: "Deadlift" } },
        { name: { contains: "Overhead Press" } },
        { name: { contains: "Barbell Row" } },
        { name: { contains: "Pull Up" } },
        { name: { contains: "Curl" } },
        { name: { contains: "Pushdown" } },
      ],
    },
    take: 8,
  });

  if (exercises.length === 0) {
    console.log("  No exercises found — run the main seed first: pnpm db:seed");
    return;
  }

  // ── Sample Workouts (last 14 days) ──
  const now = new Date();
  for (let daysAgo = 0; daysAgo < 14; daysAgo += 2) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9, 0, 0, 0);

    const workout = await db.workout.create({
      data: {
        id: crypto.randomUUID(),
        userId: athlete.id,
        name: daysAgo % 4 === 0 ? "Push Day" : "Pull Day",
        startedAt: date,
        completedAt: new Date(date.getTime() + 55 * 60 * 1000),
        durationSeconds: 55 * 60,
        workoutExercises: {
          create: exercises.slice(0, 4).map((ex, exIdx) => ({
            id: crypto.randomUUID(),
            exerciseId: ex.id,
            order: exIdx,
            sets: {
              create: Array.from({ length: 3 }, (_, setIdx) => ({
                id: crypto.randomUUID(),
                setNumber: setIdx + 1,
                weightKg: 40 + exIdx * 20 + Math.floor(Math.random() * 10),
                reps: 8 + Math.floor(Math.random() * 5),
                rpe: 7 + Math.floor(Math.random() * 3),
                completed: true,
              })),
            },
          })),
        },
      },
    });
    console.log(`  Workout: ${workout.name} (${daysAgo}d ago)`);
  }

  // ── Sample Cardio Sessions ──
  for (let daysAgo = 1; daysAgo < 14; daysAgo += 3) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(7, 0, 0, 0);

    await db.cardioSession.create({
      data: {
        id: crypto.randomUUID(),
        userId: athlete.id,
        type: daysAgo % 6 === 1 ? "run" : "cycle",
        source: "manual",
        startedAt: date,
        durationSeconds: 1800 + Math.floor(Math.random() * 1800),
        distanceMeters: 3000 + Math.floor(Math.random() * 7000),
        avgHeartRate: 140 + Math.floor(Math.random() * 20),
        maxHeartRate: 170 + Math.floor(Math.random() * 15),
        calories: 200 + Math.floor(Math.random() * 300),
      },
    });
  }
  console.log("  Cardio: 5 sessions created");

  // ── Sample Body Metrics (last 30 days) ──
  for (let daysAgo = 0; daysAgo < 30; daysAgo += 2) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dateOnly = date.toISOString().split("T")[0];

    await db.bodyMetric.upsert({
      where: {
        userId_date: {
          userId: athlete.id,
          date: new Date(dateOnly),
        },
      },
      update: {},
      create: {
        userId: athlete.id,
        date: new Date(dateOnly),
        weightKg: 82.5 - daysAgo * 0.05 + Math.random() * 0.5,
        bodyFatPct: 18.0 - daysAgo * 0.03 + Math.random() * 0.3,
        source: "manual",
      },
    });
  }
  console.log("  Body metrics: 15 entries created");

  // ── Sample Sleep Logs ──
  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dateOnly = date.toISOString().split("T")[0];
    const bedtime = new Date(date);
    bedtime.setHours(23, 0, 0, 0);
    bedtime.setDate(bedtime.getDate() - 1);
    const wakeTime = new Date(date);
    wakeTime.setHours(7, 0, 0, 0);

    await db.sleepLog.create({
      data: {
        userId: athlete.id,
        date: new Date(dateOnly),
        bedtime,
        wakeTime,
        durationMins: 480 + Math.floor(Math.random() * 60) - 30,
        quality: ["good", "excellent", "fair", "good"][daysAgo % 4],
        source: "manual",
        score: 70 + Math.floor(Math.random() * 25),
        stages: {
          deep: 80 + Math.floor(Math.random() * 30),
          light: 200 + Math.floor(Math.random() * 40),
          rem: 90 + Math.floor(Math.random() * 30),
          awake: 20 + Math.floor(Math.random() * 15),
        },
      },
    });
  }
  console.log("  Sleep logs: 14 entries created");

  console.log("\n✓ Dev seed complete!");
  console.log("\nTest accounts (all password: password123):");
  console.log("  athlete@test.com  — Athlete tier, full sample data");
  console.log("  coach@test.com    — Coach tier");
  console.log("  free@test.com     — Free tier (imperial units)");
  console.log("  new@test.com      — New user, onboarding incomplete");
}

seedDev()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
