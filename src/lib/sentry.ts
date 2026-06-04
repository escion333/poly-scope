import * as Sentry from '@sentry/react'

/**
 * Sentry init — the reusable error/stability layer for every project.
 *
 * Copy this file + the two lines in main.tsx into a new app, then set
 * VITE_SENTRY_DSN in that project's Vercel env (and local .env). With no DSN
 * set (e.g. local dev), init is a no-op so nothing is sent.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Set per-project so issues group by app in the same Sentry org.
    release: import.meta.env.VITE_SENTRY_RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance: sample 10% of transactions in prod, all in dev.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay: 0% normally, 100% of sessions that hit an error.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}
