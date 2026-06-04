export type ConcentrationSummary = {
  holderCount: number
  totalSize: number
  topHolderShare: number
  topFiveShare: number
  restShare: number
  hhi: number
  gini: number
  verdict: ConcentrationVerdict
}

export type ConcentrationVerdict =
  | 'Thin side'
  | 'Single-wallet dominated'
  | 'Whale-heavy'
  | 'Clustered'
  | 'Spread out'

export function getConcentrationSummary(sizes: number[]): ConcentrationSummary {
  const sorted = sizes.filter((size) => size > 0).sort((a, b) => b - a)
  const totalSize = sorted.reduce((sum, size) => sum + size, 0)
  const share = (size: number) => (totalSize > 0 ? size / totalSize : 0)
  const topFiveSize = sorted.slice(0, 5).reduce((sum, size) => sum + size, 0)
  const topHolderShare = share(sorted[0] ?? 0)
  const topFiveShare = share(topFiveSize)
  const hhi = totalSize
    ? sorted.reduce((sum, size) => sum + share(size) ** 2, 0) * 10000
    : 0

  return {
    holderCount: sorted.length,
    totalSize,
    topHolderShare,
    topFiveShare,
    restShare: Math.max(0, 1 - topFiveShare),
    hhi,
    gini: getGini(sorted),
    verdict: getVerdict(sorted.length, topHolderShare, topFiveShare),
  }
}

function getVerdict(
  holderCount: number,
  topHolderShare: number,
  topFiveShare: number,
): ConcentrationVerdict {
  if (holderCount > 0 && holderCount < 10) return 'Thin side'
  if (topHolderShare >= 0.5) return 'Single-wallet dominated'
  if (topHolderShare >= 0.25 || topFiveShare >= 0.7) return 'Whale-heavy'
  if (topFiveShare >= 0.45) return 'Clustered'
  return 'Spread out'
}

function getGini(sortedDescending: number[]) {
  const values = [...sortedDescending].sort((a, b) => a - b)
  const count = values.length
  const total = values.reduce((sum, value) => sum + value, 0)

  if (!count || !total) return 0

  const weighted = values.reduce(
    (sum, value, index) => sum + (index + 1) * value,
    0,
  )

  return (2 * weighted) / (count * total) - (count + 1) / count
}
