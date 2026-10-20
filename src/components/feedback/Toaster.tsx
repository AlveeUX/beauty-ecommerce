"use client";

import { useEffect, useSyncExternalStore } from "react";
import { dismissNotice, getNotice, subscribeNotice } from "@/lib/notify";
import styles from "./Toaster.module.css";

/** Latest notice in an aria-live region; disappears after a few seconds. */
export function Toaster() {
  const notice = useSyncExternalStore(subscribeNotice, getNotice, () => null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, notice.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className={styles.region} role="status" aria-live="polite" data-testid="toast-region">
      {notice ? (
        <p key={notice.id} className={styles.toast} data-tone={notice.tone} data-testid="toast">
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
