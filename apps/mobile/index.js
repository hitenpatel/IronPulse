// Hermes polyfills MUST load first — side-effect import runs before App/tRPC
// evaluate (ES imports are hoisted, so inline statements here would run too late).
import "./lib/shared-array-buffer-polyfill";

import { registerRootComponent } from "expo";
import App from "./App";

// Suppress RedBox error overlay in E2E mode (background errors block Maestro).
if (process.env.E2E === "1" && typeof ErrorUtils !== "undefined") {
  ErrorUtils.setGlobalHandler((error) => {
    console.warn("[E2E] Suppressed error:", error?.message || error);
  });
}

// Expo's generated MainActivity runs the "main" component; registerRootComponent
// registers under that name (and sets up the Expo root view).
registerRootComponent(App);
