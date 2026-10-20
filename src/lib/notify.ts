/**
 * Tiny toast store: any client code calls notify("..."), the Toaster component renders the latest
 * message in an aria-live region. Kept outside React so plain functions (cart, lists) can use it.
 */
export type Notice = { id: number; message: string; tone: "info" | "error" };

let current: Notice | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function notify(message: string, tone: Notice["tone"] = "info") {
  current = { id: nextId++, message, tone };
  emit();
}

export function dismissNotice() {
  current = null;
  emit();
}

export const subscribeNotice = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getNotice = () => current;
