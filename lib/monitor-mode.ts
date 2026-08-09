// Shared between Sidebar.tsx (the on/off toggle) and MonitorMode.tsx (the
// timer/navigation loop that lives in the root layout) so both read/write
// the exact same localStorage key and custom event name.
export const MONITOR_MODE_STORAGE_KEY = 'callisto:monitorMode'
export const MONITOR_MODE_EVENT = 'callisto:monitor-mode-changed'
