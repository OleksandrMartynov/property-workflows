"use client";

import { useEffect } from "react";
import { pushRecent } from "@/lib/recent-runs";

/** Невидимий: запам'ятовує відвіданий запуск для «Recent» у бічній панелі. */
export function TrackVisit({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    pushRecent({ id, name });
  }, [id, name]);
  return null;
}
