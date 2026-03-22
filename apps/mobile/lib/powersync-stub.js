// Stub module for E2E builds — replaces @powersync/* and @ironpulse/sync
// to avoid SharedArrayBuffer crash on Hermes Android debug builds

// Export empty hooks that return no data
module.exports = {
  // @powersync/react exports
  PowerSyncContext: { Provider: ({ children }) => children },
  useQuery: () => ({ data: [], isLoading: false }),
  usePowerSync: () => null,

  // @ironpulse/sync hook exports
  useWorkouts: () => ({ data: [], isLoading: false }),
  useWorkoutExercises: () => ({ data: [], isLoading: false }),
  useWorkoutSets: () => ({ data: [], isLoading: false }),
  useCardioSessions: () => ({ data: [], isLoading: false }),
  useExercises: () => ({ data: [], isLoading: false }),
  useTemplates: () => ({ data: [], isLoading: false }),
  useTemplateExercises: () => ({ data: [], isLoading: false }),
  useTemplateSets: () => ({ data: [], isLoading: false }),
  useBodyMetrics: () => ({ data: [], isLoading: false }),
  usePersonalRecords: () => ({ data: [], isLoading: false }),

  // @powersync/react-native exports
  getPowerSyncDatabase: () => null,
  createMobileConnector: () => ({}),
};
