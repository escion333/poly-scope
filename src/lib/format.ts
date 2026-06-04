export const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const fullNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

export const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCompactUsd(value: number | undefined) {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return compactUsd.format(safeValue)
}

export const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function shortWallet(wallet: string) {
  if (!wallet) return 'unknown'
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}
