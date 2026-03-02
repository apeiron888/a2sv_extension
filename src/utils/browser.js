/**
 * Cross-browser API compatibility layer.
 * Returns the `browser` namespace in Firefox (WebExtensions) and
 * the `chrome` namespace in Chrome/Edge, so all other modules
 * can `import { getBrowserAPI } from './browser.js'` instead of
 * using the bare `chrome.*` global directly.
 *
 * Pattern inspired by Competitive Companion's cross-browser approach.
 */
export function getBrowserAPI() {
  // Firefox exposes `browser` as a promise-based WebExtension API;
  // Chrome exposes `chrome` (callback-based). Both are global.
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  }
  return chrome;
}

/**
 * Convenience wrapper around storage.local.get that works in both browsers.
 */
export function storageGet(keys) {
  const api = getBrowserAPI();
  return new Promise((resolve, reject) => {
    api.storage.local.get(keys, (result) => {
      const err = api.runtime.lastError;
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Convenience wrapper around storage.local.set that works in both browsers.
 */
export function storageSet(data) {
  const api = getBrowserAPI();
  return new Promise((resolve, reject) => {
    api.storage.local.set(data, () => {
      const err = api.runtime.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Convenience wrapper around runtime.sendMessage that works in both browsers.
 */
export function sendMessage(message) {
  const api = getBrowserAPI();
  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response) => {
      const err = api.runtime.lastError;
      if (err) reject(err);
      else resolve(response);
    });
  });
}
