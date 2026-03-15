import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/common";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ironpulse/api";

export interface BackendConnectorOptions {
  baseUrl?: string;
  getAuthToken?: () => Promise<string | null>;
}

export class BackendConnector implements PowerSyncBackendConnector {
  private trpc;

  constructor(opts?: BackendConnectorOptions) {
    this.trpc = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${opts?.baseUrl ?? ""}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const token = await opts?.getAuthToken?.();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    });
  }

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
      if (error?.data?.code === "FORBIDDEN" || error?.data?.code === "BAD_REQUEST") {
        console.error("PowerSync upload permanent error (discarding):", error);
        await transaction.complete();
      } else {
        console.error("PowerSync upload error (will retry):", error);
      }
    }
  }
}
