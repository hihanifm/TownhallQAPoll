const listeners = new Set();

export function subscribeAppNotice(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showAppNotice(message) {
  if (!message) return;
  listeners.forEach((listener) => listener(String(message)));
}
