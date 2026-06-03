import { AlertTriangle, ExternalLink, Radar, Search } from 'lucide-react'
import { EXAMPLE_SLUGS } from './config'

function App() {
  return (
    <main className="min-h-screen bg-[#090b0f] text-zinc-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border border-cyan-300/40 bg-cyan-300/10 text-cyan-200">
              <Radar size={22} />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200/80">
                Polymarket
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                Whale Radar
              </h1>
            </div>
          </div>
          <a
            className="hidden items-center gap-2 border border-white/10 px-3 py-2 font-mono text-xs uppercase text-zinc-300 transition hover:border-cyan-300/50 hover:text-cyan-100 sm:flex"
            href="https://polymarket.com"
            target="_blank"
            rel="noreferrer"
          >
            Polymarket
            <ExternalLink size={14} />
          </a>
        </header>

        <div className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-7">
            <div className="inline-flex items-center gap-2 border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
              <AlertTriangle size={15} />
              Holder concentration, not manipulation proof
            </div>
            <div className="space-y-5">
              <h2 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                See who really holds each side.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-zinc-400">
                Paste a Polymarket event URL to reveal top holder share, top 5
                share, and the long tail behind every outcome.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_SLUGS.map((slug) => (
                <button
                  className="border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  key={slug}
                  type="button"
                >
                  {slug}
                </button>
              ))}
            </div>
          </section>

          <section className="border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-cyan-950/30 sm:p-6">
            <label
              className="mb-3 block font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
              htmlFor="market-url"
            >
              Event URL
            </label>
            <div className="flex border border-white/10 bg-black/40">
              <input
                className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                defaultValue="https://polymarket.com/event/california-governor-election-2026"
                id="market-url"
              />
              <button
                className="grid w-14 place-items-center border-l border-white/10 bg-cyan-300 text-black transition hover:bg-cyan-200"
                type="button"
                aria-label="Analyze market"
              >
                <Search size={20} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="border border-white/10 bg-black/30 p-4">
                <p className="font-mono text-xs uppercase text-zinc-500">
                  Top holder
                </p>
                <p className="mt-3 text-3xl font-semibold text-amber-300">
                  99.5%
                </p>
              </div>
              <div className="border border-white/10 bg-black/30 p-4">
                <p className="font-mono text-xs uppercase text-zinc-500">
                  Top 5
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">99.8%</p>
              </div>
              <div className="border border-white/10 bg-black/30 p-4">
                <p className="font-mono text-xs uppercase text-zinc-500">
                  Holders
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">72</p>
              </div>
            </div>

            <div className="mt-6 h-4 border border-white/10 bg-black">
              <div className="h-full w-[99.5%] bg-amber-300" />
            </div>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-amber-200">
              One wallet controls almost the entire side
            </p>
          </section>
        </div>
        <footer className="border-t border-white/10 pt-5 font-mono text-xs uppercase tracking-[0.16em] text-zinc-600">
          Data from Polymarket indexers. Holdings show exposure, not who moved
          price.
        </footer>
      </section>
    </main>
  )
}

export default App
