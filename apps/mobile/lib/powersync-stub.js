// Stub module for E2E builds — replaces @powersync/* and @ironpulse/sync
// to avoid SharedArrayBuffer crash on Hermes Android debug builds.
//
// The key fix: usePowerSync() returns a safe mock db object (not null).
// Components call db.execute(), db.get(), db.getAll() etc. — returning null
// causes "TypeError: Cannot read property 'get' of undefined" when any code
// path touches the db before checking for null.

const EMPTY_RESULT = { rows: { _array: [], length: 0, item: () => undefined }, rowsAffected: 0 };
const EMPTY_QUERY = { data: [], isLoading: false, isFetching: false, error: undefined };
const NOOP = () => {};
const NOOP_ASYNC = async () => EMPTY_RESULT;

// Safe mock database — prevents crashes when components call db.execute() etc.
const mockDb = {
  execute: NOOP_ASYNC,
  executeBatch: NOOP_ASYNC,
  get: async () => undefined,
  getAll: async () => [],
  getOptional: async () => null,
  readLock: (fn) => fn({ execute: NOOP_ASYNC, get: async () => undefined, getAll: async () => [], getOptional: async () => null }),
  writeLock: (fn) => fn({ execute: NOOP_ASYNC, get: async () => undefined, getAll: async () => [], getOptional: async () => null }),
  readTransaction: (fn) => fn({ execute: NOOP_ASYNC, get: async () => undefined, getAll: async () => [], getOptional: async () => null }),
  writeTransaction: (fn) => fn({ execute: NOOP_ASYNC, get: async () => undefined, getAll: async () => [], getOptional: async () => null }),
  connect: NOOP_ASYNC,
  disconnect: NOOP_ASYNC,
  close: NOOP_ASYNC,
  currentStatus: { connected: false, lastSyncedAt: undefined, hasSynced: false, dataFlowStatus: { uploading: false, downloading: false } },
  registerListener: () => NOOP,
  waitForStatus: async () => {},
  syncStream: () => ({ subscribe: async () => ({ unsubscribe: NOOP }) }),
};

module.exports = {
  // @powersync/react exports
  PowerSyncContext: { Provider: ({ children }) => children },
  useQuery: () => EMPTY_QUERY,
  usePowerSync: () => mockDb,
  useStatus: () => ({ connected: false, lastSyncedAt: undefined, hasSynced: false, dataFlowStatus: { uploading: false, downloading: false } }),
  usePowerSyncQuery: () => [],
  usePowerSyncStatus: () => ({ connected: false }),
  usePowerSyncWatchedQuery: () => [],
  useSuspenseQuery: () => EMPTY_QUERY,
  useWatchedQuerySuspenseSubscription: () => EMPTY_QUERY,
  useWatchedQuerySubscription: () => EMPTY_QUERY,
  useAllSyncStreamsHaveSynced: () => true,
  useSyncStream: () => null,

  // @powersync/common exports (used by @ironpulse/sync schema/connector)
  column: { text: { type: "TEXT" }, integer: { type: "INTEGER" }, real: { type: "REAL" } },
  Schema: function() { return { types: {} }; },
  Table: function() { return {}; },
  UpdateType: { PUT: "PUT", PATCH: "PATCH", DELETE: "DELETE" },
  AbstractPowerSyncDatabase: function() {},
  PowerSyncBackendConnector: function() {},
  AbstractPowerSyncDatabaseOpenFactory: function() {},
  AbstractStreamingSyncImplementation: function() {},
  SqliteBucketStorage: function() {},
  LockType: { CRUD: "CRUD", SYNC: "SYNC" },
  DEFAULT_REMOTE_LOGGER: {},

  // @ironpulse/sync hook exports
  useWorkouts: () => EMPTY_QUERY,
  useWorkoutExercises: () => EMPTY_QUERY,
  useWorkoutSets: () => EMPTY_QUERY,
  useCardioSessions: () => EMPTY_QUERY,
  useCardioSession: () => EMPTY_QUERY,
  useCardioLaps: () => EMPTY_QUERY,
  useExercises: () => EMPTY_QUERY,
  useTemplates: () => EMPTY_QUERY,
  useTemplateExercises: () => EMPTY_QUERY,
  useTemplateSets: () => EMPTY_QUERY,
  useBodyMetrics: () => EMPTY_QUERY,
  usePersonalRecords: () => EMPTY_QUERY,
  useSyncStatus: () => ({ connected: false, lastSyncedAt: undefined, hasSynced: false, uploading: false, downloading: false }),

  // @ironpulse/sync schema/connector exports
  AppSchema: { types: {} },
  BackendConnector: function() { return { fetchCredentials: NOOP_ASYNC, uploadData: NOOP_ASYNC }; },

  // @powersync/react-native exports
  PowerSyncDatabase: function() { return mockDb; },
  getPowerSyncDatabase: () => mockDb,
  createMobileConnector: () => ({ fetchCredentials: NOOP_ASYNC, uploadData: NOOP_ASYNC }),
};
