"use client";

// Side-effect: configure browser Honeybadger when NEXT_PUBLIC_HONEYBADGER_API_KEY is set.
import "../../honeybadger.browser.config.js";

/**
 * Ensures Honeybadger browser config is loaded under Turbopack,
 * where @honeybadger-io/nextjs webpack entry injection does not run.
 */
export function HoneybadgerClientInit() {
  return null;
}
