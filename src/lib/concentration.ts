export type ConcentrationSummary = {
  holderCount: number
  totalSize: number
  topHolderShare: number
  topFiveShare: number
  restShare: number
}

export function getConcentrationSummary(sizes: number[]): ConcentrationSummary {
  const sorted = sizes.filter((size) => size > 0).sort((a, b) => b - a)
  const totalSize = sorted.reduce((sum, size) => sum + size, 0)
  const share = (size: number) => (totalSize > 0 ? size / totalSize : 0)
  const topFiveSize = sorted.slice(0, 5).reduce((sum, size) => sum + size, 0)

  return {
    holderCount: sorted.length,
    totalSize,
    topHolderShare: share(sorted[0] ?? 0),
    topFiveShare: share(topFiveSize),
    restShare: Math.max(0, 1 - share(topFiveSize)),
  }
}
