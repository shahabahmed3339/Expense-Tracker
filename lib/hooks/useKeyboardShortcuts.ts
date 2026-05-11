"use client";

import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts: Array<{
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  preventDefault?: boolean;
}>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          metaKey = false,
          action,
          preventDefault = true,
        } = shortcut;

        if (
          event?.key?.toLowerCase() === key?.toLowerCase() &&
          event?.ctrlKey === ctrlKey &&
          event?.shiftKey === shiftKey &&
          event?.altKey === altKey &&
          event?.metaKey === metaKey
        ) {
          if (preventDefault) {
            event.preventDefault();
          }
          action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, shortcuts]);
}
