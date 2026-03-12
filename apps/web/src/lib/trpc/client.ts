import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@ironpulse/api";

export const trpc = createTRPCReact<AppRouter>();
