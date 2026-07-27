import clsx from 'clsx'

export type BentoSpan = 'auto' | 'desktop-full'
export type BentoBalance =
  | 'two-column-fill'
  | 'three-column-fill'
  | 'three-column-span-2'

export const getBentoItemClassName = (span: BentoSpan = 'auto') =>
  clsx('bento-grid__item', span !== 'auto' && `bento-grid__item--${span}`)

export const getBentoBalanceClassName = (balance?: BentoBalance | BentoBalance[]) => {
  if (!balance) return undefined

  const balances = Array.isArray(balance) ? balance : [balance]
  return balances.map((value) => `bento-grid__item--${value}`)
}
