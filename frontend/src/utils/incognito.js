/**
 * Best-effort incognito/private browsing detection.
 * Not 100% reliable — browser vendors intentionally limit detection — but covers
 * the most common cases (Chrome/Edge incognito, Safari private, Firefox private).
 * Returns true if the browser appears to be in private mode.
 */
export async function isIncognito() {
  // Safari private mode: localStorage.setItem throws a QuotaExceededError
  try {
    localStorage.setItem('__priv_test__', '1');
    localStorage.removeItem('__priv_test__');
  } catch (_) {
    return true;
  }

  // Chrome / Edge incognito: storage quota is capped at a fraction of normal capacity
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      // Normal profiles have GBs available; incognito is capped to ~120 MB in most versions
      if (quota !== undefined && quota < 120 * 1024 * 1024) return true;
    }
  } catch (_) {}

  // Firefox private mode: indexedDB.open() is blocked (throws or errors immediately)
  try {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('__priv_test__');
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('__priv_test__');
        resolve();
      };
      req.onerror = () => reject();
    });
  } catch (_) {
    return true;
  }

  return false;
}
