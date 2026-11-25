/** Web: the service worker generated at build time makes the app work offline (docs/specs/sync.md → Web). */
export function registerServiceWorker(): void {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Without a service worker the app still works online.
    });
  // The bundle may run after `load` has fired.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
