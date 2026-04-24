import * as React from "react";
import * as Utilities from "../common/utilities";
import styles from "./ActionButton.module.css";

interface ActionButtonProps {
  children?: React.ReactNode;
  hotkey?: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  rootStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ onClick, hotkey, children, style, rootStyle, isSelected }, ref) => (
    <button
      className={Utilities.classNames(
        styles.root,
        isSelected ? styles.selected : null
      )}
      onClick={onClick}
      ref={ref}
      style={rootStyle}
      type="button"
    >
      {Utilities.isEmpty(hotkey) ? null : (
        <span className={styles.hotkey}>{hotkey}</span>
      )}
      <span className={styles.content} style={style}>
        {children}
      </span>
    </button>
  )
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
