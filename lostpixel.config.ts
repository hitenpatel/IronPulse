import type { CustomProjectConfig } from "lost-pixel";

export const config: CustomProjectConfig = {
  pageShots: {
    pages: [
      { path: "/", name: "home" },
      { path: "/login", name: "login" },
      { path: "/signup", name: "signup" },
    ],
    baseUrl: "http://localhost:3000",
  },
  generateOnly: true,
  failOnDifference: true,
};
