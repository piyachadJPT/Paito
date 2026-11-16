"use client";

import { useEffect } from "react";
import { NOW_PARAM, clock } from "@/lib/clock";

/**
 * Applies `?now=YYYY-MM-DDTHH:MM` (or `?now=off`) once on load, then strips the
 * param from the URL so a reload does not reset the running simulation.
 */
export function ClockBoot() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(NOW_PARAM);
    if (value === null) return;
    clock.applyNowParam(value);
    url.searchParams.delete(NOW_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}
