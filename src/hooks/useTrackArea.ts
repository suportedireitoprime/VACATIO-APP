import { useEffect, useRef } from "react";
import { track } from "@/lib/analyticsEvents";
import { logAreaEvent } from "@/lib/appEvents";

/**
 * Dispara um evento de entrada de área uma única vez por montagem.
 * Uso: useTrackArea("biblioteca_aberta", { origem: "menu" });
 */
export function useTrackArea(eventName: string, params: Record<string, unknown> = {}) {
  const sentRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    track(eventName, paramsRef.current);
    // Também persiste no Supabase: é o que alimenta o funil do admin.
    logAreaEvent(eventName, paramsRef.current);
  }, [eventName]);
}
