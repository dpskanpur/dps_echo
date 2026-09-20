"use client";

import { useEffect } from "react";

/**
 * Strips the error parameters from the URL after the message has rendered.
 *
 * The sign-in error is driven entirely by query string, so a failed attempt
 * leaves a URL that redisplays the same message on every reload — long after
 * the underlying problem is gone. Clearing it means a reload shows a clean
 * login page, and an error on screen always reflects a real, recent attempt.
 */
export function ClearAuthError() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;

    for (const key of ["error", "detail", "attempted"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    if (changed) {
      const query = url.searchParams.toString();
      window.history.replaceState({}, "", url.pathname + (query ? `?${query}` : ""));
    }
  }, []);

  return null;
}
