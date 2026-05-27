import type { ReactNode } from 'react'
import { AppTopBar } from './AppTopBar'

type Props = {
  children: ReactNode
  fullHeight?: boolean
  onHome?: () => void
  topBarLeading?: ReactNode
  topBarCenter?: ReactNode
  topBarTrailing?: ReactNode
  topBarClassName?: string
}

export function AppShell({
  children,
  fullHeight = false,
  onHome,
  topBarLeading,
  topBarCenter,
  topBarTrailing,
  topBarClassName,
}: Props) {
  return (
    <div className={`appShell ${fullHeight ? 'appShellFull' : ''}`.trim()}>
      <AppTopBar
        onHome={onHome}
        leading={topBarLeading}
        center={topBarCenter}
        trailing={topBarTrailing}
        className={topBarClassName}
      />
      <main className={`appContent ${fullHeight ? 'appContentFlex' : ''}`.trim()}>{children}</main>
    </div>
  )
}
