import type { HTMLAttributes, PropsWithChildren } from 'react'

type AppShellProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

const AppShell = ({ children, className = '', ...props }: AppShellProps) => (
  <div className={`app-shell ${className}`.trim()} {...props}>{children}</div>
)

export default AppShell
