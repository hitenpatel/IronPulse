// Vitest runs pure library tests in Node. Some transitive imports pull in
// React Native native modules that only exist in the RN runtime. Stub the
// minimum surface here so pure logic under lib/ can load without pulling
// the native polyfills into the Node environment.

import { vi } from "vitest";

// react-native-get-random-values registers a global crypto polyfill via CJS
// require. Under Vitest's ESM loader that throws, and it's a no-op in Node
// anyway because global crypto is already available. Stub it out.
vi.mock("react-native-get-random-values", () => ({}));
