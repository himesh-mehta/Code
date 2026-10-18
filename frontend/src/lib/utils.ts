/**
 * utils.ts — Formatting and helper utilities for Social Pulse Content Studio
 */

/**
 * Safely formats counts into human-readable strings (e.g., 1,420, 14.2k, 1.2M)
 * with robust fallbacks for null, undefined, or NaN.
 */
export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined || typeof count !== "number" || isNaN(count)) {
    return "0";
  }

  const abs = Math.abs(count);
  if (abs >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return count.toLocaleString("en-IN");
}

/**
 * Safely formats percentage changes (e.g., +14.2%, -5%, New, 0%)
 * with safe fallbacks and "New" badge handling when the previous period had 0 mentions.
 */
export function formatChange(
  changePct: number | null | undefined,
  isNew?: boolean
): string {
  if (isNew) {
    return "New";
  }

  if (changePct === null || changePct === undefined || typeof changePct !== "number" || isNaN(changePct)) {
    return "0%";
  }

  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toFixed(1).replace(/\.0$/, "")}%`;
}

/**
 * Concatenates conditional class strings safely.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
