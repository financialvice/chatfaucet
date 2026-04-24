import * as React from "react";
import * as Utilities from "../common/utilities";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  isDisabled?: boolean;
  theme?: "PRIMARY" | "SECONDARY";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ theme = "PRIMARY", isDisabled, children, ...rest }, ref) => {
    let classNames = Utilities.classNames(styles.root, styles.primary);

    if (theme === "SECONDARY") {
      classNames = Utilities.classNames(styles.root, styles.secondary);
    }

    if (isDisabled) {
      classNames = Utilities.classNames(styles.root, styles.disabled);
      return <div className={classNames}>{children}</div>;
    }

    return (
      <button
        className={classNames}
        disabled={isDisabled}
        ref={ref}
        tabIndex={0}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
