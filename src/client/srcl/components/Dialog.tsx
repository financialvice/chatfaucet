import styles from './Dialog.module.css';

import * as React from 'react';

import Block from './Block';
import Button from './Button';

interface DialogProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  style?: React.CSSProperties;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  title,
  children,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  style,
  onConfirm,
  onCancel,
}) => {
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className={styles.root}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <header className={styles.header} id={titleId}>
          {title}
        </header>
        <br />
        <article className={styles.message} id={descId}>
          {children}
        </article>
        <br />
        <div className={styles.actions}>
          <Button theme="SECONDARY" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Block style={{ opacity: 0 }}> </Block>
          <Button
            theme="SECONDARY"
            onClick={onConfirm}
            autoFocus
            style={
              destructive
                ? { color: 'var(--ansi-9-red)' }
                : undefined
            }
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
