"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./PurchaseExtras.module.css";

/**
 * "Hurry up ! Sale end in:" with days, hours, minutes and seconds (PRD-011, Figma 3:37901).
 * `serverNow` is the server clock when the page was rendered, so the first paint already shows the
 * right numbers and a wrong device clock cannot change how long the sale runs.
 */
export function Countdown({ endsAt, serverNow }: { endsAt: number; serverNow: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, endsAt - serverNow));

  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => setRemaining(Math.max(0, endsAt - (Date.now() + offset)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt, serverNow]);

  if (remaining <= 0) return null; // the sale is over: nothing to count down to

  const total = Math.floor(remaining / 1000);
  const parts = [
    { value: Math.floor(total / 86_400), label: "Days" },
    { value: Math.floor((total % 86_400) / 3600), label: "Hours" },
    { value: Math.floor((total % 3600) / 60), label: "Mins" },
    { value: total % 60, label: "Secs" },
  ];

  return (
    <div className={styles.countdown} data-testid="countdown">
      <p>
        <Icon name="flame" size={16} />
        Hurry up ! Sale end in:
      </p>
      <ol aria-label="Time left">
        {parts.map((part) => (
          <li key={part.label} data-last={part.label === "Secs" || undefined}>
            <strong data-testid={`countdown-${part.label.toLowerCase()}`}>
              {String(part.value).padStart(2, "0")}
            </strong>
            <span>{part.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
