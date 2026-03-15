import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/web";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ironpulse/api";

function createSyncTRPCClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  });
}

export class BackendConnector implements PowerSyncBackendConnector {
  private trpc = createSyncTRPCClient();

  async fetchCredentials() {
    const result = await this.trpc.sync.getToken.query();
    return {
      endpoint: result.endpoint,
      token: result.token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        switch (op.op) {
          case UpdateType.PUT:
            await this.trpc.sync.applyChange.mutate({
              table: op.table as any,
              record: { id: op.id, ...op.opData },
            });
            break;
          case UpdateType.PATCH:
            await this.trpc.sync.update.mutate({
              table: op.table as any,
              id: op.id,
              data: op.opData ?? {},
            });
            break;
          case UpdateType.DELETE:
            await this.trpc.sync.delete.mutate({
              table: op.table as any,
              id: op.id,
            });
            break;
        }
      }
      await transaction.complete();
    } catch (error: any) {
      if (
        error?.data?.code === "FORBIDDEN" ||
        error?.data?.code === "BAD_REQUEST"
      ) {
        console.error("PowerSync upload permanent error (discarding):", error);
        await transaction.complete();
      } else {
        console.error("PowerSync upload error (will retry):", error);
      }
    }
  }
}
