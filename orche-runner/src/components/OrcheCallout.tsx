import type { ReactNode } from 'react'

type Props = {
  type: string
  title: string
  children: ReactNode
}

export function OrcheCallout({ type, title, children }: Props) {
  return (
    <div className={`orcheCallout orcheCallout_${type}`}>
      <div className="orcheCalloutTitle">{title}</div>
      <div className="orcheCalloutBody">{children}</div>
    </div>
  )
}
