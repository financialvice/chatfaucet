import type * as React from "react";
import styles from "./Block.module.css";

interface BlockProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

const Block: React.FC<BlockProps> = ({ children, ...rest }) => (
  <span className={styles.block} {...rest}>
    {children}
  </span>
);

export default Block;
