import clsx from 'clsx'
import type { PropsWithChildren, ReactNode } from 'react'
import {
  getBentoBalanceClassName,
  getBentoItemClassName,
  type BentoBalance,
  type BentoSpan,
} from './bento'

type Props = PropsWithChildren<{
  title: string
  description?: string
  aside?: ReactNode
  className?: string
  bodyClassName?: string
  bentoBalance?: BentoBalance | BentoBalance[]
  bentoSpan?: BentoSpan
}>

const ControlCard = ({
  title,
  description,
  aside,
  className,
  bodyClassName,
  bentoBalance,
  bentoSpan,
  children,
}: Props) => (
  <section
    className={clsx(
      'control-card',
      getBentoItemClassName(bentoSpan),
      getBentoBalanceClassName(bentoBalance),
      className,
    )}
  >
    <header className="control-card__header">
      <div>
        <h2 className="control-card__title">{title}</h2>
        {description ? <p className="control-card__description">{description}</p> : null}
      </div>
      {aside ? <div className="control-card__aside">{aside}</div> : null}
    </header>
    <div className={clsx('control-card__body', bodyClassName)}>{children}</div>
  </section>
)

export default ControlCard
