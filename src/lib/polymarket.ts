import { CONFIG } from '../config'
import { getConcentrationSummary } from './concentration'

export type GammaMarket = {
  id: string
  question: string
  conditionId: string
  outcomes?: string | string[]
  outcomePrices?: string | string[]
  clobTokenIds?: string | string[]
  volumeNum?: string
  liquidityNum?: string
  active?: boolean
  closed?: boolean
}

export type GammaEvent = {
  id: string
  slug: string
  title: string
  description?: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  volume24hr?: number | string
  markets?: GammaMarket[]
}

export type TrendingEvent = {
  slug: string
  title: string
  marketCount: number
  volume24hr: number
}

type MarketPositionGroup = {
  token: string
  positions?: HolderPosition[]
}

export type HolderPosition = {
  proxyWallet: string
  name?: string
  size: number | string
  avgPrice?: number | string
  currentValue?: number | string
  cashPnl?: number | string
  outcome?: string
  outcomeIndex?: number
}

export type OutcomeAnalysis = ReturnType<typeof getConcentrationSummary> & {
  token: string
  label: string
  price?: number
  positions: RankedHolder[]
  sideValue: number
  topHolderValue: number
  topFiveValue: number
}

export type RankedHolder = HolderPosition & {
  rank: number
  sizeNumber: number
  valueNumber: number
  share: number
  valueShare: number
}

export type MarketAnalysis = {
  market: GammaMarket
  outcomes: OutcomeAnalysis[]
  pagesFetched: number
  hitOffsetCeiling: boolean
  // Set when this market's positions could not be fetched. The run continues;
  // the market is rendered as failed rather than as "no holder data".
  error?: string
}

export type ProgressUpdate = {
  completed: number
  marketCount: number
  marketQuestion: string
  pagesFetched: number
}

export function parseEventSlug(input: string) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Paste a Polymarket event URL or event slug.')

  if (!trimmed.includes('/') && !trimmed.includes('?')) {
    return sanitizeSlug(trimmed)
  }

  const url = new URL(
    trimmed,
    trimmed.startsWith('http') ? undefined : 'https://polymarket.com',
  )
  const segments = url.pathname.split('/').filter(Boolean)
  const eventIndex = segments.indexOf('event')
  const slug = eventIndex >= 0 ? segments[eventIndex + 1] : segments.at(-1)

  if (!slug) throw new Error('Could not find an event slug in that URL.')

  return sanitizeSlug(slug)
}

export async function fetchEvent(slug: string) {
  return fetchJSON<GammaEvent>(`${CONFIG.GAMMA_API}/events/slug/${slug}`)
}

// Top open events by 24h volume, for the "try one of these" row under the
// search bar. Over-fetches a little and filters so we still fill `limit` after
// dropping events with no open markets. The list endpoint always nests full
// market arrays (no sparse-fieldset option), so we cache the slimmed result in
// sessionStorage to avoid re-paying that payload on every refresh.
// Callers treat a thrown error as "show nothing".
const TRENDING_CACHE_KEY = 'poly-scope:trending'
const TRENDING_TTL_MS = 10 * 60 * 1000

export async function fetchTrendingEvents(limit = 6): Promise<TrendingEvent[]> {
  const cached = readTrendingCache()
  if (cached) return cached.slice(0, limit)

  const url = new URL(`${CONFIG.GAMMA_API}/events`)
  url.searchParams.set('limit', String(limit + 2))
  url.searchParams.set('active', 'true')
  url.searchParams.set('closed', 'false')
  url.searchParams.set('archived', 'false')
  url.searchParams.set('order', 'volume24hr')
  url.searchParams.set('ascending', 'false')

  const events = await fetchJSON<GammaEvent[]>(url.toString())

  const trending = events
    .map((event) => ({
      slug: event.slug,
      title: event.title,
      marketCount: (event.markets ?? []).filter((market) => !market.closed)
        .length,
      volume24hr: parseNumber(event.volume24hr),
    }))
    .filter((event) => event.slug && event.title && event.marketCount > 0)
    .slice(0, limit)

  writeTrendingCache(trending)
  return trending
}

function readTrendingCache(): TrendingEvent[] | null {
  try {
    const raw = sessionStorage.getItem(TRENDING_CACHE_KEY)
    if (!raw) return null
    const { at, events } = JSON.parse(raw) as {
      at: number
      events: TrendingEvent[]
    }
    if (!Array.isArray(events) || Date.now() - at > TRENDING_TTL_MS) return null
    return events
  } catch {
    return null
  }
}

function writeTrendingCache(events: TrendingEvent[]) {
  try {
    sessionStorage.setItem(
      TRENDING_CACHE_KEY,
      JSON.stringify({ at: Date.now(), events }),
    )
  } catch {
    // Private mode / quota — caching is best-effort.
  }
}

export async function analyzeEvent(
  event: GammaEvent,
  onProgress: (progress: ProgressUpdate) => void,
) {
  const markets = (event.markets ?? []).filter((market) => market.conditionId)
  const marketCount = markets.length
  let completed = 0

  return mapWithConcurrency(markets, CONFIG.CONCURRENCY, async (market) => {
    let analysis: MarketAnalysis
    try {
      analysis = await fetchMarketPositions(market, {
        onPage: (pagesFetched) =>
          onProgress({
            completed,
            marketCount,
            marketQuestion: market.question,
            pagesFetched,
          }),
      })
    } catch (caught) {
      // Isolate the failure: keep every other market's data instead of
      // failing the whole run on one transient blip.
      analysis = {
        market,
        outcomes: [],
        pagesFetched: 0,
        hitOffsetCeiling: false,
        error: caught instanceof Error ? caught.message : 'Could not load this market.',
      }
    }

    completed += 1
    onProgress({
      completed,
      marketCount,
      marketQuestion: market.question,
      pagesFetched: analysis.pagesFetched,
    })

    return analysis
  })
}

// Bounded-concurrency map that preserves input order. A fixed pool of workers
// pulls from a shared cursor so at most `limit` requests are ever in flight.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: poolSize }, run))

  return results
}

async function fetchMarketPositions(
  market: GammaMarket,
  { onPage }: { onPage: (pagesFetched: number) => void },
): Promise<MarketAnalysis> {
  const grouped = new Map<string, HolderPosition[]>()
  let offset = 0
  let pagesFetched = 0
  let hitOffsetCeiling = false

  while (offset <= CONFIG.MAX_OFFSET) {
    const url = new URL(`${CONFIG.DATA_API}/v1/market-positions`)
    url.searchParams.set('market', market.conditionId)
    url.searchParams.set('limit', String(CONFIG.PAGE_SIZE))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('sortBy', 'TOKENS')
    url.searchParams.set('sortDirection', 'DESC')
    url.searchParams.set('status', 'OPEN')

    const page = await fetchJSON<MarketPositionGroup[]>(url.toString())
    pagesFetched += 1
    onPage(pagesFetched)

    let largestGroupSize = 0
    for (const group of page) {
      const positions = group.positions ?? []
      largestGroupSize = Math.max(largestGroupSize, positions.length)
      grouped.set(group.token, [...(grouped.get(group.token) ?? []), ...positions])
    }

    if (largestGroupSize < CONFIG.PAGE_SIZE) break

    offset += CONFIG.PAGE_SIZE
    hitOffsetCeiling = offset > CONFIG.MAX_OFFSET
  }

  return {
    market,
    outcomes: buildOutcomeAnalyses(market, grouped),
    pagesFetched,
    hitOffsetCeiling,
  }
}

function buildOutcomeAnalyses(
  market: GammaMarket,
  grouped: Map<string, HolderPosition[]>,
) {
  const fallbackOutcomes = parseJsonArray(market.outcomes)
  const prices = parseJsonArray(market.outcomePrices).map(Number)
  const clobTokenIds = parseJsonArray(market.clobTokenIds)

  return [...grouped.entries()].map(([token, positions]) => {
    const tokenIndex = clobTokenIds.indexOf(token)
    const price = Number.isFinite(prices[tokenIndex]) ? prices[tokenIndex] : 0
    const prepared = positions
      .map((position) => {
        const sizeNumber = parseNumber(position.size)
        const indexedValue = parseNumber(position.currentValue)

        return {
          ...position,
          sizeNumber,
          valueNumber:
            indexedValue > 0 ? indexedValue : Math.max(0, sizeNumber * price),
        }
      })
      .filter((position) => position.sizeNumber > 0)
      .sort((a, b) => b.sizeNumber - a.sizeNumber)
    const totalSize = prepared.reduce((sum, holder) => sum + holder.sizeNumber, 0)
    const sideValue = prepared.reduce((sum, holder) => sum + holder.valueNumber, 0)
    const ranked = prepared.map((position, index) => {
      return {
        ...position,
        rank: index + 1,
        share: totalSize ? position.sizeNumber / totalSize : 0,
        valueShare: sideValue ? position.valueNumber / sideValue : 0,
      }
    })

    const first = ranked[0]
    const label =
      first?.outcome ??
      fallbackOutcomes[first?.outcomeIndex ?? tokenIndex] ??
      fallbackOutcomes[tokenIndex] ??
      `Outcome ${tokenIndex >= 0 ? tokenIndex + 1 : token.slice(0, 6)}`

    return {
      ...getConcentrationSummary(ranked.map((position) => position.sizeNumber)),
      token,
      label,
      price,
      positions: ranked,
      sideValue,
      topHolderValue: ranked[0]?.valueNumber ?? 0,
      topFiveValue: ranked
        .slice(0, 5)
        .reduce((sum, position) => sum + position.valueNumber, 0),
    }
  })
}

function parseNumber(value: number | string | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (!value) return 0

  const parsed = Number(value.replace(/[$,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

async function fetchJSON<T>(url: string, attempt = 0): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${CONFIG.PROXY}${url}`, { signal: controller.signal })
  } catch (caught) {
    clearTimeout(timer)
    if (attempt < CONFIG.MAX_RETRIES) {
      await delay(retryDelay(attempt))
      return fetchJSON<T>(url, attempt + 1)
    }
    const timedOut = caught instanceof DOMException && caught.name === 'AbortError'
    throw new Error(
      timedOut
        ? 'Polymarket took too long to respond. Check your connection and try again.'
        : 'Could not reach Polymarket from the browser. If this is CORS, set CONFIG.PROXY.',
      { cause: caught },
    )
  }
  clearTimeout(timer)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Event not found. Check the slug or Polymarket URL.')
    }

    const retryable = response.status === 429 || response.status >= 500
    if (retryable && attempt < CONFIG.MAX_RETRIES) {
      await delay(retryDelay(attempt))
      return fetchJSON<T>(url, attempt + 1)
    }

    if (response.status === 429) {
      throw new Error('Polymarket is rate limiting this request. Try again soon.')
    }

    throw new Error(`Polymarket API returned ${response.status}.`)
  }

  return response.json() as Promise<T>
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(attempt: number) {
  return CONFIG.RETRY_BASE_MS * 2 ** attempt
}

function sanitizeSlug(slug: string) {
  const clean = slug.replace(/^\/+|\/+$/g, '').trim()
  if (!/^[a-zA-Z0-9-]+$/.test(clean)) {
    throw new Error('That does not look like a valid Polymarket event slug.')
  }

  return clean
}

function parseJsonArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
