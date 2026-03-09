import { config } from './config';

let warmedUp = false;

/**
 * Fires a single health-check on first visit to wake the server,
 * then prefetches critical API data so the visitor sees zero latency.
 */
export function warmUpServer() {
  if (warmedUp) return;
  warmedUp = true;

  const base = config.apiBaseUrl;

  // Parallel warm-up: health + critical data the homepage needs
  const urls = [
    `${base}/health`,
    `${base}/cms/pages/home`,
  ];

  urls.forEach((url) => {
    fetch(url, { method: 'GET', cache: 'no-store', priority: 'low' as any })
      .catch(() => {}); // silent
  });
}
