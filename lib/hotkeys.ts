"use client";

import { useEffect } from "react";

export type HotkeyOptions = {
  /** Skip when the active element is a textarea, input, or contentEditable. */
  ignoreInputs?: boolean;
  /** Skip when the window has any text currently selected. */
  ignoreIfSelected?: boolean;
};

/**
 * Bind a global hotkey to a handler.
 *
 * Combo format: dash- or plus-joined tokens, last token is the key.
 *   "meta+enter"   "meta+k"   "escape"   "meta+shift+p"
 *
 * `meta` matches both Cmd (macOS) and Ctrl (Win/Linux).
 * Matching is strict on modifiers — "escape" will not fire on Shift+Escape.
 */
export function useHotkey(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: HotkeyOptions = {}
): void {
  const { ignoreInputs = false, ignoreIfSelected = false } = options;

  useEffect(() => {
    const parts = combo.toLowerCase().split(/[+\-]/);
    const key = parts[parts.length - 1];
    const needsMeta = parts.includes("meta");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");

    function isTextInput(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === "TEXTAREA" || tag === "INPUT";
    }

    function hasSelection(): boolean {
      const sel = window.getSelection();
      return !!sel && sel.toString().length > 0;
    }

    function onKey(e: KeyboardEvent) {
      const metaPressed = e.metaKey || e.ctrlKey;
      if (needsMeta !== metaPressed) return;
      if (needsShift !== e.shiftKey) return;
      if (needsAlt !== e.altKey) return;
      if (e.key.toLowerCase() !== key) return;

      if (ignoreInputs && isTextInput(e.target)) return;
      if (ignoreIfSelected && hasSelection()) return;

      e.preventDefault();
      handler(e);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, handler, ignoreInputs, ignoreIfSelected]);
}
