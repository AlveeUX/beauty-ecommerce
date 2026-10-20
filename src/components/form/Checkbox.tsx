"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./Checkbox.module.css";

type Props = {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
};

/** 16px square check box with the design's dark fill when checked (Figma "Check mark" 3:22870). */
export function Checkbox({ name, checked, onChange, children, error }: Props) {
  const id = useId();
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          data-testid={`check-${name}`}
        />
        <span className={styles.box} aria-hidden="true">
          <Icon name="check" size={12} />
        </span>
        <label htmlFor={id}>{children}</label>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className={styles.error} data-testid={`error-${name}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
