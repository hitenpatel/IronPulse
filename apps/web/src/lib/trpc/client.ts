import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@mettlelift/api";

export const trpc = createTRPCReact<AppRouter>();
