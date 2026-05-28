import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  width?: 'md' | 'lg'
}

export function SidePanel({ title, onClose, children, width = 'md' }: Props) {
  return (
    <>
      <button type="button" className="sidePanelScrim" onClick={onClose} aria-label="Close panel" />
      <aside
        className={`sidePanel sidePanel_${width}`}
        role="dialog"
        aria-label={title}
      >
        <div className="sidePanelHead">
          <h2 className="sidePanelTitle">{title}</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sidePanelBody">{children}</div>
      </aside>
    </>
  )
}
