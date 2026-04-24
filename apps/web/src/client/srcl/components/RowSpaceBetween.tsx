import * as React from "react";
import styles from "./RowSpaceBetween.module.css";

type RowSpaceBetweenProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

const RowSpaceBetween = React.forwardRef<HTMLElement, RowSpaceBetweenProps>(
  ({ children, ...rest }, ref) => (
    <section className={styles.row} ref={ref} {...rest}>
      {children}
    </section>
  )
);

RowSpaceBetween.displayName = "RowSpaceBetween";

export default RowSpaceBetween;
