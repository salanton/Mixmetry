import clsx from 'clsx'
import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { BentoBalance, BentoSpan } from './bento'

type BentoGridProps = PropsWithChildren<{
  className?: string
  minItemWidth?: string
}>

type BentoChildProps = {
  bentoBalance?: BentoBalance | BentoBalance[]
  bentoSpan?: BentoSpan
}

const addBalance = (
  balancesByIndex: Map<number, BentoBalance[]>,
  index: number,
  balance: BentoBalance,
) => {
  const currentBalances = balancesByIndex.get(index) ?? []
  balancesByIndex.set(index, [...currentBalances, balance])
}

const getBalancedChildren = (children: ReactNode) => {
  const items = Children.toArray(children)
  const balancesByIndex = new Map<number, BentoBalance[]>()
  let autoItemsInCurrentGroup: number[] = []

  const balanceCurrentGroup = () => {
    if (autoItemsInCurrentGroup.length % 2 === 1) {
      addBalance(
        balancesByIndex,
        autoItemsInCurrentGroup[autoItemsInCurrentGroup.length - 1],
        'two-column-fill',
      )
    }

    const threeColumnRemainder = autoItemsInCurrentGroup.length % 3
    if (threeColumnRemainder === 1) {
      addBalance(
        balancesByIndex,
        autoItemsInCurrentGroup[autoItemsInCurrentGroup.length - 1],
        'three-column-fill',
      )
    }

    if (threeColumnRemainder === 2) {
      addBalance(
        balancesByIndex,
        autoItemsInCurrentGroup[autoItemsInCurrentGroup.length - 2],
        'three-column-span-2',
      )
    }

    autoItemsInCurrentGroup = []
  }

  items.forEach((item, index) => {
    if (!isValidElement<BentoChildProps>(item)) {
      return
    }

    if (item.props.bentoSpan === 'desktop-full') {
      balanceCurrentGroup()
      return
    }

    autoItemsInCurrentGroup.push(index)
  })

  balanceCurrentGroup()

  return items.map((item, index) => {
    const bentoBalance = balancesByIndex.get(index)

    if (!bentoBalance || !isValidElement<BentoChildProps>(item)) {
      return item
    }

    return cloneElement(item as ReactElement<BentoChildProps>, {
      bentoBalance: item.props.bentoBalance ?? bentoBalance,
    })
  })
}

const BentoGrid = ({ children, className, minItemWidth }: BentoGridProps) => {
  const style = minItemWidth
    ? ({ '--bento-min-item-width': minItemWidth } as CSSProperties)
    : undefined

  return (
    <div className={clsx('bento-grid', className)} style={style}>
      {getBalancedChildren(children)}
    </div>
  )
}

export default BentoGrid
