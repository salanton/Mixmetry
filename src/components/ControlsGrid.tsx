import type { PropsWithChildren } from 'react'
import BentoGrid from './BentoGrid'

const ControlsGrid = ({ children }: PropsWithChildren) => (
  <BentoGrid className="controls-grid">{children}</BentoGrid>
)

export default ControlsGrid
