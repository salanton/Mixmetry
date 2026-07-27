import type { PropsWithChildren } from 'react'

type AppShellProps = PropsWithChildren<{
  className?: string
}>

const AppShell = ({ children, className = '' }: AppShellProps) => (
  <div className={`app-shell ${className}`.trim()}>{children}</div>
)

export default AppShell
