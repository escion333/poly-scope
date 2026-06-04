export const CONFIG = {
  // If browser CORS ever fails, set this to a proxy prefix that accepts the
  // target URL appended after it. Direct fetches work when this stays empty.
  PROXY: '',
  GAMMA_API: 'https://gamma-api.polymarket.com',
  DATA_API: 'https://data-api.polymarket.com',
  PAGE_SIZE: 500,
  MAX_OFFSET: 10000,
  // Per-request hard timeout so a single hung fetch can't freeze the whole run.
  REQUEST_TIMEOUT_MS: 15000,
  // Retries (with exponential backoff) on timeout, 429, and 5xx. 404s never retry.
  MAX_RETRIES: 2,
  RETRY_BASE_MS: 600,
  // Markets fetched in parallel. Big events have 100+ markets; serial is too slow.
  CONCURRENCY: 5,
} as const
