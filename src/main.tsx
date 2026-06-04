import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry.ts'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<AppCrashed />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

function AppCrashed() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0d] px-6 text-center text-zinc-100">
      <div>
        <h1 className="text-lg font-semibold">Something went wrong.</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The error was reported. Try reloading the page.
        </p>
      </div>
    </main>
  )
}
