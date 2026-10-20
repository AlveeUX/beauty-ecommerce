import styles from "./MenuBadge.module.css";

/** "HOT" (red) / "NEW" (green) tag after a menu entry. */
export function MenuBadge({ kind }: { kind: "hot" | "new" }) {
  return (
    <span className={`${styles.badge} ${kind === "hot" ? styles.hot : styles.new}`}>
      {kind === "hot" ? "Hot" : "New"}
    </span>
  );
}
