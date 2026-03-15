import { AppShell } from "@/components/layout/app-shell";
import { PowerSyncProvider } from "@/lib/powersync/provider";

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
