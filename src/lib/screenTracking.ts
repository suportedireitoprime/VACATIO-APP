/**
 * Screen tracking para web — screen_view, screen_exit, scroll depth.
 * No nativo o Firebase Analytics já gerencia isso via nativeLogScreen.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { track, trackScreen, isNativeApp } from "./analyticsEvents";

const SCROLL_MILESTONES = [25, 50, 75, 100];

function isDebug(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ga_debug");
}

export function useScreenTracking() {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const milestonesRef = useRef<Set<number>>(new Set());
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    if (isNativeApp()) return;

    const path = location.pathname + location.search;
    if (lastPathRef.current && lastPathRef.current !== path) {
      const duration = Date.now() - startTimeRef.current;
      track("screen_exit", {
        screen_path: lastPathRef.current,
        engagement_time_msec: duration,
      });
    }
    lastPathRef.current = path;
    startTimeRef.current = Date.now();
    milestonesRef.current = new Set();

    trackScreen(path);

    if (isDebug()) {
       
      console.log("[analytics] screen_view", path);
    }
  }, [location.pathname, location.search]);

  // Scroll depth
  useEffect(() => {
    if (isNativeApp()) return;

    const handler = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      if (scrollHeight <= 0) return;
      const percent = Math.round((scrollTop / scrollHeight) * 100);

      SCROLL_MILESTONES.forEach((milestone) => {
        if (percent >= milestone && !milestonesRef.current.has(milestone)) {
          milestonesRef.current.add(milestone);
          track("scroll_depth", {
            percent: milestone,
            screen_path: location.pathname + location.search,
          });
        }
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [location.pathname, location.search]);

  // screen_exit ao desmontar/fechar
  useEffect(() => {
    if (isNativeApp()) return;
    const onBeforeUnload = () => {
      const duration = Date.now() - startTimeRef.current;
      track("screen_exit", {
        screen_path: lastPathRef.current,
        engagement_time_msec: duration,
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
}
