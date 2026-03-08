/**
 * Safe JSON parse — returns fallback if the value isn't valid JSON.
 * Handles plain strings, nulls, and already-parsed objects.
 */
function safeJsonParse(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value; // already parsed
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
    // Plain string — wrap in array if fallback is array
    return Array.isArray(fallback) ? [value] : fallback;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return Array.isArray(fallback) ? [value] : fallback;
  }
}

module.exports = { safeJsonParse };
