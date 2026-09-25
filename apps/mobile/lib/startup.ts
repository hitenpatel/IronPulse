import { hydrateServerUrl } from "./server";

/** Completes fail-closed origin preparation before app consumers mount. */
export async function prepareOriginStartup(): Promise<void> {
  await hydrateServerUrl();
}
