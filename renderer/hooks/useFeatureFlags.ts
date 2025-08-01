/**
 * Feature Flags Hook
 * Controls feature availability for the enhanced logging system
 */

export interface LoggingFlags {
  realTime: boolean;
  filtering: boolean;
  virtualScroll: boolean;
  export: boolean;
  detailView: boolean;
  bulkActions: boolean;
}

/**
 * Hook to get logging feature flags
 * Currently returns static flags, but can be extended to read from config/API
 */
export const useLoggingFlags = (): LoggingFlags => {
  return {
    realTime: true,
    filtering: true,
    virtualScroll: true,
    export: false, // Phase 2 feature
    detailView: true,
    bulkActions: false, // Phase 2 feature
  };
};

export default useLoggingFlags;