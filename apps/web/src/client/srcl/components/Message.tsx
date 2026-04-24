import type { ReactNode } from "react";
import styles from "./Message.module.css";

export default function Message({ children }: { children: ReactNode }) {
  return (
    <div className={styles.message}>
      <div className={styles.left}>
        <figure className={styles.triangle} />
      </div>
      <div className={styles.right}>
        <div className={styles.bubble}>{children}</div>
      </div>
    </div>
  );
}
