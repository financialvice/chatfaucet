import type { ReactNode } from "react";
import styles from "./MessageViewer.module.css";

export default function MessageViewer({ children }: { children: ReactNode }) {
  return (
    <div className={styles.message}>
      <div className={styles.left}>
        <div className={styles.bubble}>{children}</div>
      </div>
      <div className={styles.right}>
        <figure className={styles.triangle} />
      </div>
    </div>
  );
}
