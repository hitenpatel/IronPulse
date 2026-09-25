import identityData from "./identity.json";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepReadonly<T> = T extends Primitive | ((...args: never[]) => unknown)
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : { readonly [Key in keyof T]: DeepReadonly<T[Key]> };

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

export const IDENTITY = deepFreeze(identityData);
export const CANONICAL_ORIGINS = IDENTITY.origins;
export const IMMUTABLE_APPLICATION_IDS = IDENTITY.immutableCompatibility.applicationIds;
export const MIGRATION_ONLY_ORIGINS = IDENTITY.migrationOnly.legacyOrigins;
