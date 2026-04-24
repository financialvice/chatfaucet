import * as React from "react";
import Block from "./Block";
import Button from "./Button";
import styles from "./Dialog.module.css";

interface DialogProps {
  cancelLabel?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  style?: React.CSSProperties;
  title?: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({
  title,
  children,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
  style,
  onConfirm,
  onCancel,
}) => {
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
      if (e.key === "Enter") {
        onConfirm?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      aria-describedby={descId}
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <button
        aria-label={cancelLabel}
        className={styles.backdropDismiss}
        onClick={() => onCancel?.()}
        tabIndex={-1}
        type="button"
      />
      <div className={styles.root} style={style}>
        <header className={styles.header} id={titleId}>
          {title}
        </header>
        <br />
        <article className={styles.message} id={descId}>
          {children}
        </article>
        <br />
        <div className={styles.actions}>
          <Button onClick={onCancel} theme="SECONDARY">
            {cancelLabel}
          </Button>
          <Block style={{ opacity: 0 }}> </Block>
          <Button
            autoFocus
            onClick={onConfirm}
            style={destructive ? { color: "var(--ansi-9-red)" } : undefined}
            theme="SECONDARY"
          >
            {confirmLabel}
          </Button>
        </div>
        <br />
      </div>
    </div>
  );
};

export default Dialog;
