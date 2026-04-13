"use client";

import { createContext, useContext } from "react";

export type DataMode = "powersync" | "trpc";

export const DataModeContext = createContext<DataMode>("trpc");

/** Returns "powersync" when PowerSync is initialized, "trpc" otherwise */
export function useDataMode(): DataMode {
  return useContext(DataModeContext);
}
