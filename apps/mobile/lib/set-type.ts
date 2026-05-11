export type SetType = "working" | "warmup" | "dropset" | "failure";

export const SET_TYPE_ORDER: SetType[] = ["working", "warmup", "dropset", "failure"];

export const SET_TYPE_LABEL: Record<SetType, string> = {
  working: "Working",
  warmup: "Warm-up",
  dropset: "Drop set",
  failure: "To failure",
};

export function normalizeSetType(value: string | null | undefined): SetType {
  return value === "warmup" || value === "dropset" || value === "failure"
    ? value
    : "working";
}
