import type { ChipTone } from "@/components/ui";

/** "physical_therapy" -> "Physical therapy". Purely descriptive — no advice. */
export function humanizeEnumValue(value: string): string {
  const [first, ...rest] = value.split("_");
  return [capitalize(first ?? ""), ...rest].filter(Boolean).join(" ");
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const STATUS_TONE: Record<string, ChipTone> = {
  active: "amber",
  recovering: "blue",
  resolved: "green",
};

export function statusTone(status: string): ChipTone {
  return STATUS_TONE[status] ?? "mono";
}
