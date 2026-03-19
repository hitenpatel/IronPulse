"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { TRPCProvider } from "@/lib/trpc/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <TRPCProvider>{children}</TRPCProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
