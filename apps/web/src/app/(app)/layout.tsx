import { AppShell } from "@/components/layout/app-shell";
import { PowerSyncProvider } from "@/lib/powersync/provider";

// All app pages use PowerSync hooks which require the browser — skip static generation
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PowerSyncProvider>
      <AppShell>{children}</AppShell>
    </PowerSyncProvider>
  );
}
