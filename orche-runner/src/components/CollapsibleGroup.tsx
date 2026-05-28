import { useState, type ReactNode } from 'react'

type Props = {
  title: string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleGroup({ title, meta, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`collapsibleGroup ${open ? 'collapsibleGroupOpen' : ''}`}>
      <button
        type="button"
        className="collapsibleGroupHead"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="collapsibleGroupChevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <span className="collapsibleGroupTitle">{title}</span>
        {meta ? <span className="collapsibleGroupMeta muted">{meta}</span> : null}
      </button>
      {open ? <div className="collapsibleGroupBody">{children}</div> : null}
    </div>
  )
}
