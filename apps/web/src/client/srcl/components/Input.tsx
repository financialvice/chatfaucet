import * as React from "react";
import * as Utilities from "../common/utilities";

import styles from "./Input.module.css";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  caretChars?: React.ReactNode;
  label?: React.ReactNode;
  isBlink?: boolean;
};

function Input({
  caretChars,
  isBlink = true,
  label,
  placeholder,
  onChange,
  type,
  id,
  ...rest
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState<string>(
    rest.defaultValue?.toString() || rest.value?.toString() || ""
  );
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<number>(
    text.length
  );

  const lastFocusDirectionRef = React.useRef<"up" | "down" | null>(null);

  React.useEffect(() => {
    if (rest.value !== undefined) {
      const val = rest.value.toString();
      setText(val);
      setSelectionStart(val.length);
    }
  }, [rest.value]);

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    if (onChange) {
      onChange(e);
    }
    setSelectionStart(e.target.selectionStart ?? value.length);
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    if (!inputRef.current) {
      return;
    }

    if (lastFocusDirectionRef.current === "down") {
      setSelectionStart(text.length);
      inputRef.current.setSelectionRange(text.length, text.length);
    } else if (lastFocusDirectionRef.current === "up") {
      setSelectionStart(0);
      inputRef.current.setSelectionRange(0, 0);
    }
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget as HTMLInputElement;
    setSelectionStart(inputEl.selectionStart ?? text.length);
  };

  const onHandleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget as HTMLInputElement;
    inputEl.focus();
    setSelectionStart(inputEl.selectionStart ?? text.length);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      lastFocusDirectionRef.current = "up";
      const previousFocusable = Utilities.findNextFocusable(
        document.activeElement,
        "previous"
      );
      previousFocusable?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      lastFocusDirectionRef.current = "down";
      const nextFocusable = Utilities.findNextFocusable(
        document.activeElement,
        "next"
      );
      nextFocusable?.focus();
    }
  };

  const isPlaceholderVisible = !text && placeholder;
  const containerClasses = Utilities.classNames(
    styles.root,
    isFocused && styles.focused
  );

  const maskText = (t: string) =>
    type === "password" ? "•".repeat(t.length) : t;

  const beforeCaretText = isPlaceholderVisible
    ? (placeholder ?? "")
    : maskText(text.slice(0, selectionStart));
  const afterCaretText = isPlaceholderVisible
    ? ""
    : maskText(text.slice(selectionStart));

  return (
    <div className={containerClasses}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        <div
          className={Utilities.classNames(
            styles.displayed,
            isPlaceholderVisible && styles.placeholder
          )}
        >
          {beforeCaretText}
          {!isPlaceholderVisible && (
            <span
              className={Utilities.classNames(
                styles.block,
                isBlink && styles.blink
              )}
            >
              {caretChars || ""}
            </span>
          )}
          {!isPlaceholderVisible && afterCaretText}
        </div>
        <input
          aria-placeholder={placeholder}
          className={styles.hidden}
          id={inputId}
          onBlur={onHandleBlur}
          onChange={onHandleChange}
          onClick={onHandleClick}
          onFocus={onHandleFocus}
          onKeyDown={onHandleKeyDown}
          onSelect={onHandleSelect}
          ref={inputRef}
          type={type}
          value={text}
          {...rest}
        />
      </div>
    </div>
  );
}

export default Input;
