import type * as React from "react";
import styles from "./Text.module.css";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

const Text: React.FC<TextProps> = ({ children, ...rest }) => (
  <p className={styles.text} {...rest}>
    {children}
  </p>
);

export default Text;
