import { describe, it, expect } from "vitest";
import {
  UnitSystem,
  Tier,
  SubscriptionStatus,
  AuthProvider,
  MuscleGroup,
  Equipment,
  ExerciseCategory,
  SetType,
  CardioType,
  CardioSource,
  PRType,
} from "../enums";

function noDuplicateValues(obj: Record<string, string>) {
  const vals = Object.values(obj);
  expect(new Set(vals).size).toBe(vals.length);
}

describe("UnitSystem", () => {
  it("has the expected string values", () => {
    expect(UnitSystem.METRIC).toBe("metric");
    expect(UnitSystem.IMPERIAL).toBe("imperial");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(UnitSystem);
  });

  it("contains exactly two entries", () => {
    expect(Object.keys(UnitSystem)).toHaveLength(2);
  });
});

describe("Tier", () => {
  it("has the expected string values", () => {
    expect(Tier.ATHLETE).toBe("athlete");
    expect(Tier.COACH).toBe("coach");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(Tier);
  });

  it("contains exactly two entries", () => {
    expect(Object.keys(Tier)).toHaveLength(2);
  });
});

describe("SubscriptionStatus", () => {
  it("has the expected string values", () => {
    expect(SubscriptionStatus.TRIALING).toBe("trialing");
    expect(SubscriptionStatus.ACTIVE).toBe("active");
    expect(SubscriptionStatus.PAST_DUE).toBe("past_due");
    expect(SubscriptionStatus.CANCELLED).toBe("cancelled");
    expect(SubscriptionStatus.NONE).toBe("none");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(SubscriptionStatus);
  });

  it("contains exactly five entries", () => {
    expect(Object.keys(SubscriptionStatus)).toHaveLength(5);
  });
});

describe("AuthProvider", () => {
  it("has the expected string values", () => {
    expect(AuthProvider.EMAIL).toBe("email");
    expect(AuthProvider.GOOGLE).toBe("google");
    expect(AuthProvider.APPLE).toBe("apple");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(AuthProvider);
  });

  it("contains exactly three entries", () => {
    expect(Object.keys(AuthProvider)).toHaveLength(3);
  });
});

describe("MuscleGroup", () => {
  it("has the expected string values for primary muscle groups", () => {
    expect(MuscleGroup.CHEST).toBe("chest");
    expect(MuscleGroup.BACK).toBe("back");
    expect(MuscleGroup.SHOULDERS).toBe("shoulders");
    expect(MuscleGroup.BICEPS).toBe("biceps");
    expect(MuscleGroup.TRICEPS).toBe("triceps");
    expect(MuscleGroup.QUADS).toBe("quads");
    expect(MuscleGroup.HAMSTRINGS).toBe("hamstrings");
    expect(MuscleGroup.GLUTES).toBe("glutes");
    expect(MuscleGroup.ABS).toBe("abs");
  });

  it("has the expected string values for secondary muscle groups", () => {
    expect(MuscleGroup.FOREARMS).toBe("forearms");
    expect(MuscleGroup.CALVES).toBe("calves");
    expect(MuscleGroup.OBLIQUES).toBe("obliques");
    expect(MuscleGroup.TRAPS).toBe("traps");
    expect(MuscleGroup.LATS).toBe("lats");
    expect(MuscleGroup.LOWER_BACK).toBe("lower_back");
    expect(MuscleGroup.HIP_FLEXORS).toBe("hip_flexors");
    expect(MuscleGroup.ADDUCTORS).toBe("adductors");
    expect(MuscleGroup.ABDUCTORS).toBe("abductors");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(MuscleGroup);
  });

  it("contains exactly 18 entries", () => {
    expect(Object.keys(MuscleGroup)).toHaveLength(18);
  });
});

describe("Equipment", () => {
  it("has the expected string values", () => {
    expect(Equipment.BARBELL).toBe("barbell");
    expect(Equipment.DUMBBELL).toBe("dumbbell");
    expect(Equipment.KETTLEBELL).toBe("kettlebell");
    expect(Equipment.MACHINE).toBe("machine");
    expect(Equipment.CABLE).toBe("cable");
    expect(Equipment.BODYWEIGHT).toBe("bodyweight");
    expect(Equipment.BAND).toBe("band");
    expect(Equipment.OTHER).toBe("other");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(Equipment);
  });

  it("contains exactly eight entries", () => {
    expect(Object.keys(Equipment)).toHaveLength(8);
  });
});

describe("ExerciseCategory", () => {
  it("has the expected string values", () => {
    expect(ExerciseCategory.COMPOUND).toBe("compound");
    expect(ExerciseCategory.ISOLATION).toBe("isolation");
    expect(ExerciseCategory.CARDIO).toBe("cardio");
    expect(ExerciseCategory.STRETCHING).toBe("stretching");
    expect(ExerciseCategory.PLYOMETRIC).toBe("plyometric");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(ExerciseCategory);
  });

  it("contains exactly five entries", () => {
    expect(Object.keys(ExerciseCategory)).toHaveLength(5);
  });
});

describe("SetType", () => {
  it("has the expected string values", () => {
    expect(SetType.WORKING).toBe("working");
    expect(SetType.WARMUP).toBe("warmup");
    expect(SetType.DROPSET).toBe("dropset");
    expect(SetType.FAILURE).toBe("failure");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(SetType);
  });

  it("contains exactly four entries", () => {
    expect(Object.keys(SetType)).toHaveLength(4);
  });
});

describe("CardioType", () => {
  it("has the expected string values", () => {
    expect(CardioType.RUN).toBe("run");
    expect(CardioType.CYCLE).toBe("cycle");
    expect(CardioType.SWIM).toBe("swim");
    expect(CardioType.HIKE).toBe("hike");
    expect(CardioType.WALK).toBe("walk");
    expect(CardioType.ROW).toBe("row");
    expect(CardioType.ELLIPTICAL).toBe("elliptical");
    expect(CardioType.OTHER).toBe("other");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(CardioType);
  });

  it("contains exactly eight entries", () => {
    expect(Object.keys(CardioType)).toHaveLength(8);
  });
});

describe("CardioSource", () => {
  it("has the expected string values", () => {
    expect(CardioSource.MANUAL).toBe("manual");
    expect(CardioSource.GPS).toBe("gps");
    expect(CardioSource.GPX).toBe("gpx");
    expect(CardioSource.FIT).toBe("fit");
    expect(CardioSource.GARMIN).toBe("garmin");
    expect(CardioSource.STRAVA).toBe("strava");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(CardioSource);
  });

  it("contains exactly six entries", () => {
    expect(Object.keys(CardioSource)).toHaveLength(6);
  });
});

describe("PRType", () => {
  it("has the expected string values", () => {
    expect(PRType.ONE_RM).toBe("1rm");
    expect(PRType.THREE_RM).toBe("3rm");
    expect(PRType.FIVE_RM).toBe("5rm");
    expect(PRType.VOLUME).toBe("volume");
  });

  it("has no duplicate values", () => {
    noDuplicateValues(PRType);
  });

  it("contains exactly four entries", () => {
    expect(Object.keys(PRType)).toHaveLength(4);
  });
});
