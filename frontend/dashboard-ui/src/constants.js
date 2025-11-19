// Refresh interval configuration
export const DEFAULT_REFRESH_INTERVAL_MS = 1000; // Default: 1 second
export const MIN_REFRESH_INTERVAL_MS = 750; // Minimum: 0.75 seconds
export const MAX_REFRESH_INTERVAL_MS = 7000; // Maximum: 7 seconds
export const REFRESH_INTERVAL_STEP_MS = 250; // Step: 0.25 seconds

// Predefined refresh interval options (in milliseconds)
// Increments of 0.25s (250ms) from 0.75s to 7s
export const REFRESH_INTERVAL_OPTIONS = (() => {
  const options = [];
  for (let ms = MIN_REFRESH_INTERVAL_MS; ms <= MAX_REFRESH_INTERVAL_MS; ms += REFRESH_INTERVAL_STEP_MS) {
    const seconds = ms / 1000;
    // Format label: show as decimal if not whole number (e.g., "1.25"), otherwise as whole (e.g., "1")
    const label = seconds % 1 === 0 ? `${seconds}` : `${seconds.toFixed(2)}`;
    options.push({ value: ms, label });
  }
  return options;
})();

