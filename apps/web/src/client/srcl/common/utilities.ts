export function classNames(...args: unknown[]): string {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    if (typeof arg === "string" || typeof arg === "number") {
      classes.push(String(arg));
    } else if (Array.isArray(arg)) {
      const inner = classNames(...arg);
      if (inner) {
        classes.push(inner);
      }
    } else if (typeof arg === "object") {
      for (const [k, v] of Object.entries(arg as Record<string, unknown>)) {
        if (v) {
          classes.push(k);
        }
      }
    }
  }
  return classes.join(" ");
}

export function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) {
    return true;
  }
  if (typeof v === "string") {
    return v.length === 0;
  }
  if (Array.isArray(v)) {
    return v.length === 0;
  }
  return false;
}

export function findNextFocusable(
  current: Element | null,
  direction: "previous" | "next"
): HTMLElement | null {
  const selectors =
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(selectors)
  ).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
  );
  if (!current) {
    return null;
  }
  const idx = focusable.indexOf(current as HTMLElement);
  if (idx === -1) {
    return null;
  }
  const next = direction === "next" ? idx + 1 : idx - 1;
  return focusable[next] ?? null;
}

export function noop(): null {
  return null;
}
