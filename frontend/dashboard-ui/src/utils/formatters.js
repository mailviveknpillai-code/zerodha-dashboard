/**
 * Formatting utilities for displaying numeric values in the UI.
 * Centralizes formatting logic to reduce code duplication across components.
 * 
 * All functions handle null, undefined, and empty string inputs gracefully,
 * returning appropriate default values ('-' for display values, '' for change values).
 */

/**
 * Formats a numeric value to a fixed number of decimal places (default 2)
 * and handles null/undefined/empty string inputs gracefully.
 * 
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} [decimals=2] - Number of decimal places (default: 2)
 * @returns {string} The formatted string or '-' if invalid
 * 
 * @example
 * formatPrice(1234.567) // "1234.57"
 * formatPrice(null) // "-"
 * formatPrice(100, 0) // "100"
 */
export function formatPrice(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(decimals) : String(value);
}

/**
 * Formats a numeric value as an integer with locale-specific thousands separators.
 * Handles null/undefined/empty string inputs gracefully.
 * 
 * @param {number|string|null|undefined} value - The value to format
 * @returns {string} The formatted string or '-' if invalid
 * 
 * @example
 * formatInteger(1234567) // "1,234,567"
 * formatInteger(null) // "-"
 */
export function formatInteger(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString() : String(value);
}

/**
 * Formats a strike price value, typically as an integer with locale-specific thousands separators.
 * Handles null/undefined/empty string inputs gracefully.
 * 
 * @param {number|string|null|undefined} value - The strike price value
 * @returns {string} The formatted string or '-' if invalid
 * 
 * @example
 * formatStrikeValue(25000) // "25,000"
 * formatStrikeValue(null) // "-"
 */
export function formatStrikeValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
}

/**
 * Formats a change value with a leading '+' for positive numbers, or '±' for zero.
 * Returns empty string for null/undefined/empty inputs.
 * 
 * @param {number|string|null|undefined} value - The change value
 * @param {number} [decimals=2] - Number of decimal places (default: 2)
 * @returns {string} The formatted string (e.g., "+1.23", "-4.56", "±0.00") or empty string if invalid
 * 
 * @example
 * formatChange(1.23) // "+1.23"
 * formatChange(-4.56) // "-4.56"
 * formatChange(0) // "±0.00"
 * formatChange(null) // ""
 */
export function formatChange(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const formatted = numeric.toFixed(decimals);
  return numeric > 0 ? `+${formatted}` : numeric < 0 ? formatted : `±${formatted}`;
}

/**
 * Formats a percentage change value with a leading '+' for positive numbers, or '±' for zero, and a '%' sign.
 * Returns empty string for null/undefined/empty inputs.
 * 
 * @param {number|string|null|undefined} value - The percentage change value
 * @param {number} [decimals=2] - Number of decimal places (default: 2)
 * @returns {string} The formatted string (e.g., "+1.23%", "-4.56%", "±0.00%") or empty string if invalid
 * 
 * @example
 * formatChangePercent(1.23) // "+1.23%"
 * formatChangePercent(-4.56) // "-4.56%"
 * formatChangePercent(0) // "±0.00%"
 * formatChangePercent(null) // ""
 */
export function formatChangePercent(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const formatted = numeric.toFixed(decimals);
  return `${numeric > 0 ? `+${formatted}` : numeric < 0 ? formatted : `±${formatted}`}%`;
}

