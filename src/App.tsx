import { ChevronRight, ExternalLink, Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { clsx } from 'clsx'
import logoUrl from './assets/polyscope.svg'
import {
  compactNumber,
  formatCompactUsd,
  percent,
  shortWallet,
} from './lib/format'
import {
  analyzeEvent,
  fetchEvent,
  parseEventSlug,
} from './lib/polymarket'
import type {
  GammaEvent,
  MarketAnalysis,
  OutcomeAnalysis,
  ProgressUpdate,
  RankedHolder,
} from './lib/polymarket'

const BUILD_DAY = 1

type LoadState = 'idle' | 'loading' | 'success' | 'error'
type MarketSort =
  | 'concentration'
  | 'value'
  | 'volume'
  | 'liquidity'
  | 'holders'

function App() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState('')
  const [event, setEvent] = useState<GammaEvent | null>(null)
  const [markets, setMarkets] = useState<MarketAnalysis[]>([])
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)

  const marketStats = useMemo(() => {
    const outcomeCount = markets.reduce(
      (sum, market) => sum + market.outcomes.length,
      0,
    )
    const ceilingHits = markets.filter((market) => market.hitOffsetCeiling).length
    const failedMarkets = markets.filter((market) => market.error).length
    const openMarkets = markets.filter((market) => !market.market.closed).length
    const closedMarkets = markets.length - openMarkets
    const whaleSides = markets.reduce(
      (sum, market) =>
        sum +
        market.outcomes.filter((outcome) =>
          ['Single-wallet dominated', 'Whale-heavy'].includes(outcome.verdict),
        ).length,
      0,
    )

    return {
      closedMarkets,
      outcomeCount,
      ceilingHits,
      failedMarkets,
      openMarkets,
      whaleSides,
    }
  }, [markets])

  async function runAnalysis(nextInput = input) {
    setInput(nextInput)
    setState('loading')
    setError('')
    setEvent(null)
    setMarkets([])
    setProgress(null)

    try {
      const slug = parseEventSlug(nextInput)
      const nextEvent = await fetchEvent(slug)
      setEvent(nextEvent)
      const nextMarkets = await analyzeEvent(nextEvent, setProgress)
      setMarkets(nextMarkets)
      setState('success')
    } catch (caught) {
      setState('error')
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runAnalysis()
  }

  return (
    <main className="min-h-screen bg-[#080a0d] text-zinc-100">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(34,211,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <Hero
          compact={state === 'success' && Boolean(event)}
          input={input}
          isLoading={state === 'loading'}
          onInput={setInput}
          onSubmit={handleSubmit}
        />

        {state === 'loading' || state === 'error' ? (
          <div className="mx-auto w-full max-w-2xl pb-12">
            <StatusPanel
              event={event}
              error={error}
              marketStats={marketStats}
              progress={progress}
              state={state}
            />
          </div>
        ) : null}

        {state === 'success' && event ? (
          <Results event={event} markets={markets} />
        ) : null}

        <footer className="mt-auto border-t border-white/10 py-5 font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">
          Day {BUILD_DAY} of 30 · one mini app a day →{' '}
          <a
            className="text-zinc-400 transition hover:text-cyan-200"
            href="https://x.com/tomsanee"
            target="_blank"
            rel="noreferrer"
          >
            @tomsanee
          </a>
        </footer>
      </section>
    </main>
  )
}

function Hero({
  compact = false,
  input,
  isLoading,
  onInput,
  onSubmit,
}: {
  compact?: boolean
  input: string
  isLoading: boolean
  onInput: (input: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section
      className={clsx(
        'relative flex flex-col items-center justify-start',
        compact ? 'pb-8 pt-2' : 'flex-1 pb-12 pt-2 sm:pt-4',
      )}
    >
      {/* Centered logo whose bottom dissolves into shadow */}
      <div
        className={clsx(
          'relative',
          compact ? 'w-[min(28vw,150px)]' : 'w-[min(48vw,300px)]',
        )}
      >
        <img
          src={logoUrl}
          alt="Poly Scope"
          draggable={false}
          className="w-full select-none opacity-95 invert drop-shadow-[0_0_70px_rgba(34,211,238,0.22)]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#080a0d] via-[#080a0d]/85 to-transparent" />
      </div>

      {/* Hero text rides up over the blurred-out base of the mark */}
      <div className="relative z-10 -mt-6 flex w-full max-w-2xl flex-col items-center text-center">
        <h1
          className={clsx(
            'font-semibold leading-[0.92] tracking-tight text-white',
            compact
              ? 'text-3xl sm:text-4xl'
              : 'text-6xl sm:text-7xl lg:text-8xl',
          )}
        >
          See who really holds each side.
        </h1>
        {compact ? null : (
          <p className="mt-6 max-w-xl text-xl leading-8 text-zinc-400">
            Paste any Polymarket event. We break down who's holding each side —
            top wallet, top 5, and the long tail. Concentration isn't
            manipulation, but it's worth knowing who's on the other side of your
            trade.
          </p>
        )}
        <div className={clsx('w-full max-w-xl', compact ? 'mt-6' : 'mt-8')}>
          <SearchPanel
            input={input}
            isLoading={isLoading}
            onInput={onInput}
            onSubmit={onSubmit}
          />
        </div>
        {compact ? (
          <p className="mt-3 w-full max-w-xl font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
            Data from Polymarket. Holdings = exposure, not who moved the price.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function SearchPanel({
  input,
  isLoading,
  onInput,
  onSubmit,
}: {
  input: string
  isLoading: boolean
  onInput: (input: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      className="border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-cyan-950/30 sm:p-5"
      onSubmit={onSubmit}
    >
      <label
        className="mb-3 block font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
        htmlFor="market-url"
      >
        Event URL or slug
      </label>
      <div className="flex border border-white/10 bg-black/40">
        <input
          className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          id="market-url"
          onChange={(event) => onInput(event.target.value)}
          placeholder="https://polymarket.com/event/..."
          value={input}
        />
        <button
          className="grid w-14 place-items-center border-l border-white/10 bg-cyan-300 text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:bg-zinc-600"
          type="submit"
          disabled={isLoading}
          aria-label="Analyze event"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        </button>
      </div>
    </form>
  )
}

function StatusPanel({
  event,
  error,
  marketStats,
  progress,
  state,
}: {
  event: GammaEvent | null
  error: string
  marketStats: {
    closedMarkets: number
    outcomeCount: number
    ceilingHits: number
    failedMarkets: number
    openMarkets: number
    whaleSides: number
  }
  progress: ProgressUpdate | null
  state: LoadState
}) {
  if (state === 'error') {
    return (
      <aside className="border border-red-400/30 bg-red-950/20 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-red-200">
          Couldn't pull that one
        </p>
        <p className="mt-5 text-2xl font-semibold text-white">{error}</p>
      </aside>
    )
  }

  if (state === 'loading') {
    return (
      <aside className="border border-cyan-300/20 bg-white/[0.035] p-6">
        <div className="flex items-center gap-3 text-cyan-200">
          <Loader2 className="animate-spin" size={22} />
          <p className="font-mono text-xs uppercase tracking-[0.18em]">
            Pulling positions
          </p>
        </div>
        <p className="mt-5 text-3xl font-semibold leading-tight text-white">
          {event?.title ?? 'Finding the event…'}
        </p>
        {progress ? (
          <div className="mt-6 space-y-3">
            <div className="h-2 border border-white/10 bg-black">
              <div
                className="h-full bg-cyan-300 transition-[width]"
                style={{
                  width: `${(progress.completed / progress.marketCount) * 100}%`,
                }}
              />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
              {progress.completed} / {progress.marketCount} markets · page{' '}
              {progress.pagesFetched}
            </p>
            <p className="line-clamp-2 text-sm text-zinc-400">
              {progress.marketQuestion}
            </p>
          </div>
        ) : null}
      </aside>
    )
  }

  if (state === 'success' && event) {
    return (
      <aside className="border border-white/10 bg-white/[0.035] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
          Locked in
        </p>
        <p className="mt-5 text-3xl font-semibold leading-tight text-white">
          {event.title}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Markets" value={String(event.markets?.length ?? 0)} />
          <Stat label="Sides" value={String(marketStats.outcomeCount)} />
          <Stat label="Whale sides" value={String(marketStats.whaleSides)} />
        </div>
        {marketStats.ceilingHits ? (
          <p className="mt-4 border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            Hit our fetch limit on some markets — percentages cover the
            holders we pulled, not the full book.
          </p>
        ) : null}
        {marketStats.failedMarkets ? (
          <p className="mt-4 border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-100">
            {marketStats.failedMarkets} market
            {marketStats.failedMarkets === 1 ? '' : 's'} couldn't be loaded — the
            rest came through. Re-run to retry the ones that failed.
          </p>
        ) : null}
      </aside>
    )
  }

  return null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/30 p-4">
      <p className="font-mono text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function Results({
  event,
  markets,
}: {
  event: GammaEvent
  markets: MarketAnalysis[]
}) {
  const [sortBy, setSortBy] = useState<MarketSort>('concentration')
  const signals = markets
    .flatMap((market) =>
      market.outcomes.map((outcome) => ({
        market,
        outcome,
        score:
          outcome.verdict === 'Thin side'
            ? outcome.topHolderShare - 1
            : outcome.topHolderShare,
      })),
    )
    .sort((a, b) => b.score - a.score)
  const sortedMarkets = [...markets].sort(
    (a, b) => getMarketSortValue(b, sortBy) - getMarketSortValue(a, sortBy),
  )

  return (
    <section className="space-y-4 pb-12">
      <Scoreboard event={event} markets={markets} rows={signals} />

      <div className="overflow-hidden border border-white/10">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            {sortedMarkets.length <= 1
              ? '1 market'
              : `Markets sorted by ${SORT_LABELS[sortBy]}`}
          </p>
          <SortControls
            active={sortBy}
            disabled={sortedMarkets.length <= 1}
            onChange={setSortBy}
          />
        </div>
        {sortedMarkets.map((market) => (
          <MarketRow analysis={market} key={market.market.conditionId} />
        ))}
      </div>
    </section>
  )
}

const SORT_LABELS: Record<MarketSort, string> = {
  concentration: 'strongest concentration',
  value: 'largest side value',
  volume: 'market volume',
  liquidity: 'market liquidity',
  holders: 'holder count',
}

function SortControls({
  active,
  disabled = false,
  onChange,
}: {
  active: MarketSort
  disabled?: boolean
  onChange: (sort: MarketSort) => void
}) {
  const options: MarketSort[] = [
    'concentration',
    'value',
    'volume',
    'liquidity',
    'holders',
  ]

  return (
    <div className={clsx('flex flex-wrap gap-1', disabled && 'opacity-40')}>
      {options.map((option) => (
        <button
          className={clsx(
            'border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition',
            active === option
              ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100'
              : 'border-white/10 text-zinc-500',
            disabled
              ? 'cursor-not-allowed'
              : 'hover:border-white/20 hover:text-zinc-300',
          )}
          key={option}
          onClick={() => onChange(option)}
          type="button"
          disabled={disabled}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

const SCOREBOARD_LIMIT = 12

const VERDICT_SHORT: Record<OutcomeAnalysis['verdict'], string> = {
  'Single-wallet dominated': 'Single-wallet',
  'Whale-heavy': 'Whale-heavy',
  Clustered: 'Clustered',
  'Spread out': 'Spread',
  'Thin side': 'Thin',
}

const SCOREBOARD_GRID =
  'grid grid-cols-[minmax(0,1.5fr)_7.5rem_3.25rem_3.25rem_minmax(5rem,1fr)_4.25rem_3.25rem] items-center gap-3'

function Scoreboard({
  event,
  markets,
  rows,
}: {
  event: GammaEvent
  markets: MarketAnalysis[]
  rows: Array<{ market: MarketAnalysis; outcome: OutcomeAnalysis; score: number }>
}) {
  const multiMarket = markets.length > 1
  const sideCount = rows.length
  const whaleSides = rows.filter((row) =>
    ['Single-wallet dominated', 'Whale-heavy'].includes(row.outcome.verdict),
  ).length
  const ceilingHits = markets.filter((market) => market.hitOffsetCeiling).length
  const failedMarkets = markets.filter((market) => market.error).length
  const visible = rows.slice(0, SCOREBOARD_LIMIT)
  const hidden = sideCount - visible.length

  return (
    <section className="border border-white/10 bg-white/[0.02]">
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">
            Concentration scoreboard
          </p>
          <h2 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white">
            {event.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <ScorePill label="markets" value={String(markets.length)} />
          <ScorePill label="sides" value={String(sideCount)} />
          <ScorePill label="whale" value={String(whaleSides)} tone="amber" />
        </div>
      </header>

      {visible.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className={clsx(
                SCOREBOARD_GRID,
                'border-b border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600',
              )}
            >
              <span>Side</span>
              <span>Verdict</span>
              <span className="text-right">Top 1</span>
              <span className="text-right">Top 5</span>
              <span>Concentration</span>
              <span className="text-right">Value</span>
              <span className="text-right">Holders</span>
            </div>
            {visible.map((row, index) => (
              <ScoreRow
                key={`${row.market.market.conditionId}-${row.outcome.token}`}
                lead={index === 0}
                multiMarket={multiMarket}
                outcome={row.outcome}
                question={row.market.market.question}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-zinc-500">
          No holder data for this event.
        </p>
      )}

      <footer className="flex flex-col gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Sorted by concentration · size-weighted</span>
        <span className="flex items-center gap-3">
          {hidden > 0 ? (
            <span className="text-zinc-500">
              {visible.length} of {sideCount} sides — rest below
            </span>
          ) : null}
          {ceilingHits ? (
            <span className="text-amber-300/80">
              ⚠ {ceilingHits} market{ceilingHits === 1 ? '' : 's'} hit ceiling
            </span>
          ) : null}
          {failedMarkets ? (
            <span className="text-red-300/80">
              ⚠ {failedMarkets} market{failedMarkets === 1 ? '' : 's'} failed to load
            </span>
          ) : null}
        </span>
      </footer>
    </section>
  )
}

function ScoreRow({
  lead = false,
  multiMarket = false,
  outcome,
  question,
}: {
  lead?: boolean
  multiMarket?: boolean
  outcome: OutcomeAnalysis
  question: string
}) {
  const nextFourShare = Math.max(0, outcome.topFiveShare - outcome.topHolderShare)

  return (
    <div
      className={clsx(
        SCOREBOARD_GRID,
        'border-b border-white/10 px-4 py-3 text-sm transition last:border-b-0 hover:bg-white/[0.03]',
        lead && 'bg-amber-400/[0.06]',
      )}
    >
      <div
        className={clsx(
          'min-w-0 border-l-2 pl-2.5',
          lead ? 'border-amber-300' : 'border-transparent',
        )}
      >
        <span className="block truncate font-mono text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100">
          {outcome.label}
        </span>
        {multiMarket ? (
          <span className="block truncate text-[11px] leading-4 text-zinc-500">
            {question}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <VerdictPill verdict={outcome.verdict} />
      </div>

      <span className="text-right font-mono text-xs text-amber-200">
        {percent.format(outcome.topHolderShare)}
      </span>
      <span className="text-right font-mono text-xs text-zinc-300">
        {percent.format(outcome.topFiveShare)}
      </span>

      <div className="group/bar relative">
        <div
          className={clsx(
            'pointer-events-none absolute right-0 z-10 hidden min-w-64 border border-white/10 bg-zinc-950/95 p-3 font-mono text-[10px] uppercase tracking-[0.1em] shadow-2xl shadow-black/40 group-hover/bar:block group-focus-within/bar:block',
            lead ? 'top-full mt-2' : 'bottom-full mb-2',
          )}
        >
          <BarLegend
            color="bg-amber-300"
            label="Top holder"
            value={percent.format(outcome.topHolderShare)}
          />
          <BarLegend
            color="bg-cyan-300"
            label="Next 4"
            value={percent.format(nextFourShare)}
          />
          <BarLegend
            color="bg-zinc-700"
            label="Rest"
            value={percent.format(outcome.restShare)}
          />
        </div>
        <div className="flex h-2 overflow-hidden bg-zinc-950">
          <div className="bg-amber-300" style={{ width: `${outcome.topHolderShare * 100}%` }} />
          <div className="bg-cyan-300" style={{ width: `${nextFourShare * 100}%` }} />
          <div className="bg-zinc-700" style={{ width: `${outcome.restShare * 100}%` }} />
        </div>
      </div>

      <span className="text-right font-mono text-xs text-zinc-300">
        {formatCompactUsd(outcome.sideValue)}
      </span>
      <span className="text-right font-mono text-xs text-zinc-400">
        {compactNumber.format(outcome.holderCount)}
      </span>
    </div>
  )
}

function ScorePill({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: string
  tone?: 'muted' | 'amber'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-baseline gap-1.5 border px-2 py-1',
        tone === 'amber'
          ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
          : 'border-white/10 bg-black/30 text-zinc-400',
      )}
    >
      <span className="text-zinc-100">{value}</span>
      <span>{label}</span>
    </span>
  )
}

function VerdictPill({ verdict }: { verdict: OutcomeAnalysis['verdict'] }) {
  const tone = getVerdictTone(verdict)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]',
        tone === 'amber' && 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        tone === 'cyan' && 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
        tone === 'green' && 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
        tone === 'muted' && 'border-white/10 bg-white/[0.04] text-zinc-400',
      )}
    >
      <span
        className={clsx(
          'size-1.5 rounded-full',
          tone === 'amber' && 'bg-amber-300',
          tone === 'cyan' && 'bg-cyan-300',
          tone === 'green' && 'bg-emerald-300',
          tone === 'muted' && 'bg-zinc-500',
        )}
      />
      {VERDICT_SHORT[verdict]}
    </span>
  )
}

function MarketRow({ analysis }: { analysis: MarketAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <article className="border-b border-white/10 last:border-b-0">
      <button
        className="flex w-full items-start justify-between gap-4 px-4 pt-4 text-left transition hover:bg-white/[0.025]"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {analysis.error ? (
              <div className="mb-3">
                <Badge tone="red">Failed to load</Badge>
              </div>
            ) : analysis.hitOffsetCeiling ? (
              <div className="mb-3">
                <Badge tone="amber">Ceiling hit</Badge>
              </div>
            ) : null}
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">
              {analysis.market.question}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:justify-end">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-600 sm:text-right">
              Volume {formatCompactUsd(Number(analysis.market.volumeNum) || 0)} ·
              Liquidity{' '}
              {formatCompactUsd(Number(analysis.market.liquidityNum) || 0)}
            </p>
            <ChevronRight
              className={clsx(
                'shrink-0 text-zinc-600 transition',
                isExpanded && 'rotate-90 text-cyan-200',
              )}
            />
          </div>
        </div>
      </button>

      <div className="grid gap-3 px-4 pb-4 pt-4 md:grid-cols-2">
        {analysis.outcomes.map((outcome) => (
          <OutcomeSignal
            expanded={isExpanded}
            outcome={outcome}
            key={outcome.token}
          />
        ))}
        {!analysis.outcomes.length ? (
          <p
            className={clsx(
              'col-span-full border p-4 text-sm',
              analysis.error
                ? 'border-red-400/30 bg-red-950/20 text-red-200'
                : 'border-white/10 bg-black/30 text-zinc-500',
            )}
          >
            {analysis.error ?? 'No holder data for this market.'}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function OutcomeSignal({
  expanded = false,
  outcome,
}: {
  expanded?: boolean
  outcome: OutcomeAnalysis
}) {
  const nextFourShare = Math.max(
    0,
    outcome.topFiveShare - outcome.topHolderShare,
  )

  return (
    <div
      className={clsx(
        'group/outcome border border-white/10 bg-black/30',
        expanded ? 'p-4' : 'p-3',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs uppercase tracking-[0.12em] text-zinc-400">
          {outcome.label}
        </span>
        <span className="font-mono text-xs text-zinc-500" title="Outcome price">
          {typeof outcome.price === 'number'
            ? `${Math.round(outcome.price * 1000) / 10}c`
            : compactNumber.format(outcome.holderCount)}
        </span>
      </div>
      <div className="relative mt-2">
        <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden min-w-64 border border-white/10 bg-zinc-950/95 p-3 font-mono text-[10px] uppercase tracking-[0.1em] shadow-2xl shadow-black/40 group-hover/outcome:block group-focus-within/outcome:block">
          <BarLegend
            color="bg-amber-300"
            label="Top holder"
            value={percent.format(outcome.topHolderShare)}
          />
          <BarLegend
            color="bg-cyan-300"
            label="Next 4"
            value={percent.format(nextFourShare)}
          />
          <BarLegend
            color="bg-zinc-700"
            label="Rest"
            value={percent.format(outcome.restShare)}
          />
        </div>
        <div className="flex h-2 overflow-hidden bg-zinc-950">
          <div
            className="bg-amber-300"
            style={{ width: `${outcome.topHolderShare * 100}%` }}
          />
          <div
            className="bg-cyan-300"
            style={{ width: `${nextFourShare * 100}%` }}
          />
          <div
            className="bg-zinc-700"
            style={{ width: `${outcome.restShare * 100}%` }}
          />
        </div>
      </div>
      {expanded ? (
        <>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge tone={getVerdictTone(outcome.verdict)}>{outcome.verdict}</Badge>
            <div className="text-right font-mono text-xs">
              <span className="block text-amber-200">
                {percent.format(outcome.topHolderShare)}
              </span>
              <span className="block text-zinc-500">
                {formatCompactUsd(outcome.sideValue)}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniMetric
              label="Top 1"
              value={percent.format(outcome.topHolderShare)}
            />
            <MiniMetric label="Top 5" value={percent.format(outcome.topFiveShare)} />
            <MiniMetric
              label="Side value"
              value={formatCompactUsd(outcome.sideValue)}
            />
            <MiniMetric
              label="Top 5 value"
              value={formatCompactUsd(outcome.topFiveValue)}
            />
          </div>
          <HolderTable compact holders={outcome.positions.slice(0, 10)} />
        </>
      ) : null}
    </div>
  )
}

function BarLegend({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2 py-1 text-zinc-500">
      <span className={clsx('size-2 shrink-0', color)} />
      <span className="truncate">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}
function getWorstOutcome(analysis: MarketAnalysis) {
  return [...analysis.outcomes].sort((a, b) => {
    const aThinPenalty = a.verdict === 'Thin side' ? -1 : 0
    const bThinPenalty = b.verdict === 'Thin side' ? -1 : 0
    return b.topHolderShare + bThinPenalty - (a.topHolderShare + aThinPenalty)
  })[0]
}

function getMarketSortValue(analysis: MarketAnalysis, sortBy: MarketSort) {
  if (sortBy === 'value') {
    return Math.max(...analysis.outcomes.map((outcome) => outcome.sideValue), 0)
  }

  if (sortBy === 'volume') return Number(analysis.market.volumeNum) || 0
  if (sortBy === 'liquidity') return Number(analysis.market.liquidityNum) || 0

  if (sortBy === 'holders') {
    return analysis.outcomes.reduce(
      (sum, outcome) => sum + outcome.holderCount,
      0,
    )
  }

  const worst = getWorstOutcome(analysis)
  return (worst?.verdict === 'Thin side' ? -1 : 0) + (worst?.topHolderShare ?? 0)
}

function HolderTable({
  compact = false,
  holders,
}: {
  compact?: boolean
  holders: RankedHolder[]
}) {
  if (!holders.length) {
    return (
      <p className="mt-3 border border-white/10 p-3 text-sm text-zinc-500">
        No holder data for this side.
      </p>
    )
  }

  return (
    <div className="mt-3 overflow-hidden border border-white/10">
      <div className="grid grid-cols-[2rem_1fr_auto_auto_auto_auto] gap-2 border-b border-white/10 bg-white/[0.035] px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        <span>#</span>
        <span>Wallet</span>
        <span className="text-right">Size</span>
        <span className="text-right">Value</span>
        <span className="text-right">Share</span>
        <span className="sr-only">Explorer proof</span>
      </div>
      {holders.map((holder) => (
        <div
          className={clsx(
            'grid grid-cols-[2rem_1fr_auto_auto_auto_auto] items-center gap-2 border-b border-white/10 px-2 text-sm transition last:border-b-0 hover:bg-white/[0.04]',
            compact ? 'py-2' : 'py-3',
          )}
          key={`${holder.proxyWallet}-${holder.rank}`}
        >
          <span className="font-mono text-xs text-zinc-500">#{holder.rank}</span>
          <a
            className="min-w-0 hover:text-cyan-200"
            href={`https://polymarket.com/profile/${holder.proxyWallet}`}
            target="_blank"
            rel="noreferrer"
            title="Open Polymarket profile"
          >
            <span className="block truncate text-zinc-100">
              {holder.name || shortWallet(holder.proxyWallet)}
            </span>
            <span className="block truncate font-mono text-[11px] text-zinc-600">
              {shortWallet(holder.proxyWallet)}
            </span>
          </a>
          <span className="font-mono text-xs text-zinc-100">
            {compactNumber.format(holder.sizeNumber)}
          </span>
          <span className="font-mono text-xs text-zinc-100">
            {formatCompactUsd(holder.valueNumber)}
          </span>
          <span className="font-mono text-xs text-amber-200">
            {percent.format(holder.share)}
          </span>
          <a
            className="justify-self-end text-zinc-500 transition hover:text-cyan-200"
            href={`https://polygonscan.com/address/${holder.proxyWallet}`}
            target="_blank"
            rel="noreferrer"
            title="Open wallet on Polygonscan"
            aria-label={`Open ${shortWallet(holder.proxyWallet)} on Polygonscan`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      ))}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-2">
      <p className="font-mono text-[10px] uppercase text-zinc-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-zinc-100">{value}</p>
    </div>
  )
}

function Badge({
  children,
  tone,
}: {
  children: string
  tone: 'amber' | 'cyan' | 'green' | 'muted' | 'red'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em]',
        tone === 'amber' && 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        tone === 'cyan' && 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
        tone === 'green' && 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
        tone === 'red' && 'border-red-400/30 bg-red-950/30 text-red-200',
        tone === 'muted' && 'border-white/10 bg-white/[0.04] text-zinc-400',
      )}
    >
      <ChevronRight size={12} />
      {children}
    </span>
  )
}

function getVerdictTone(verdict: OutcomeAnalysis['verdict']) {
  if (verdict === 'Spread out') return 'green'
  if (verdict === 'Clustered') return 'cyan'
  if (verdict === 'Thin side') return 'muted'
  return 'amber'
}

export default App
